/**
 * Frontend Controller for NodeJs-Full-Architecture Dashboard
 */

class App {
    constructor() {
        this.employees = [];
        this.users = [];
        this.activeTab = 'employees';
        this.tokenTicker = null;
    }

    async init() {
        // Listen for authentication changes from api.js
        window.addEventListener('auth-change', (e) => {
            this.updateAuthUI(e.detail);
        });

        // Initialize UI state
        this.updateAuthUI({
            user: api.currentUser,
            roles: api.roles,
            token: api.accessToken
        });

        // Start token expiration ticker
        this.startTokenTicker();

        // Attempt silent session recovery via cookie on initial page load
        try {
            const data = await api.refreshToken();
            if (data && data.accessToken) {
                this.showToast(`Welcome back, ${api.currentUser || 'User'}! Session restored.`, 'success');
                await this.loadEmployees();
            }
        } catch (e) {
            // Not logged in or expired cookie; show guest state
            console.log('No active session cookie found.');
            this.switchTab('auth');
        }
    }

    /* ----------------------------------------------------
       Navigation & View Management
    ---------------------------------------------------- */
    switchTab(tabId) {
        this.activeTab = tabId;

        // Update nav links
        document.querySelectorAll('.nav-links button').forEach(btn => btn.classList.remove('active'));
        const activeNavBtn = document.getElementById(`nav-btn-${tabId}`);
        if (activeNavBtn) activeNavBtn.classList.add('active');

        // Update view panes
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        const activePane = document.getElementById(`view-${tabId}`);
        if (activePane) activePane.classList.add('active');

        // Tab-specific actions
        if (tabId === 'employees') {
            if (api.isAuthenticated()) {
                this.loadEmployees();
            } else {
                this.renderEmployeesTable([]);
            }
        } else if (tabId === 'admin') {
            if (!api.isAdmin()) {
                document.getElementById('admin-restricted-view').style.display = 'block';
                document.getElementById('admin-content-view').style.display = 'none';
            } else {
                document.getElementById('admin-restricted-view').style.display = 'none';
                document.getElementById('admin-content-view').style.display = 'block';
                this.loadUsers();
            }
        } else if (tabId === 'inspector') {
            this.updateInspector();
        }
    }

    switchAuthSubTab(subTab) {
        const loginBtn = document.getElementById('tab-btn-login');
        const regBtn = document.getElementById('tab-btn-register');
        const loginForm = document.getElementById('form-login');
        const regForm = document.getElementById('form-register');

        if (subTab === 'login') {
            loginBtn.classList.add('active');
            regBtn.classList.remove('active');
            loginForm.style.display = 'block';
            regForm.style.display = 'none';
        } else {
            loginBtn.classList.remove('active');
            regBtn.classList.add('active');
            loginForm.style.display = 'none';
            regForm.style.display = 'block';
        }
    }

    /* ----------------------------------------------------
       Auth State & UI Synchronization
    ---------------------------------------------------- */
    updateAuthUI(authDetail) {
        const usernameEl = document.getElementById('nav-username');
        const roleBadgeEl = document.getElementById('nav-role-badge');
        const avatarEl = document.getElementById('user-avatar');
        const authActionBtn = document.getElementById('nav-auth-action-btn');
        const statRoleEl = document.getElementById('stat-user-role');
        const statStatusEl = document.getElementById('stat-session-status');
        const btnAddEmployee = document.getElementById('btn-open-add-employee');

        if (authDetail && authDetail.token) {
            const username = authDetail.user || 'Authenticated User';
            usernameEl.textContent = username;
            avatarEl.textContent = username.charAt(0).toUpperCase();

            // Determine role badge
            let roleName = 'User (2001)';
            let badgeClass = 'badge-user';

            if (api.isAdmin()) {
                roleName = 'Admin (5150)';
                badgeClass = 'badge-admin';
            } else if (api.isEditor()) {
                roleName = 'Editor (1984)';
                badgeClass = 'badge-editor';
            }

            roleBadgeEl.textContent = roleName;
            roleBadgeEl.className = `badge ${badgeClass}`;
            statRoleEl.textContent = roleName;
            statStatusEl.textContent = 'Authenticated';
            statStatusEl.style.color = 'var(--success)';

            authActionBtn.textContent = 'Sign Out';
            authActionBtn.className = 'btn btn-secondary btn-sm';

            // Gating "Add Employee" button (Editor or Admin only)
            if (btnAddEmployee) {
                if (api.isEditor()) {
                    btnAddEmployee.style.display = 'inline-flex';
                } else {
                    btnAddEmployee.style.display = 'none';
                }
            }
        } else {
            usernameEl.textContent = 'Guest';
            avatarEl.textContent = '?';
            roleBadgeEl.textContent = 'Unauthenticated';
            roleBadgeEl.className = 'badge badge-guest';
            statRoleEl.textContent = 'Guest';
            statStatusEl.textContent = 'Signed Out';
            statStatusEl.style.color = 'var(--text-subtle)';

            authActionBtn.textContent = 'Sign In';
            authActionBtn.className = 'btn btn-primary btn-sm';

            if (btnAddEmployee) {
                btnAddEmployee.style.display = 'none';
            }
        }

        this.updateInspector();
    }

    handleAuthButtonClick() {
        if (api.isAuthenticated()) {
            this.handleLogout();
        } else {
            this.switchTab('auth');
        }
    }

    /* ----------------------------------------------------
       Authentication Handlers
    ---------------------------------------------------- */
    async handleLogin(event) {
        event.preventDefault();
        const user = document.getElementById('login-username').value.trim();
        const pwd = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('btn-login-submit');

        if (!user || !pwd) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';
            await api.login(user, pwd);
            this.showToast(`Logged in successfully as ${user}!`, 'success');
            document.getElementById('form-login').reset();
            this.switchTab('employees');
            await this.loadEmployees();
        } catch (err) {
            this.showToast(err.message || 'Login failed', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        const user = document.getElementById('reg-username').value.trim();
        const pwd = document.getElementById('reg-password').value;
        const confirmPwd = document.getElementById('reg-password-confirm').value;
        const submitBtn = document.getElementById('btn-register-submit');

        if (pwd !== confirmPwd) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registering...';
            await api.register(user, pwd);
            this.showToast(`User ${user} created! Logging in...`, 'success');
            
            // Auto login after registration
            await api.login(user, pwd);
            document.getElementById('form-register').reset();
            this.switchTab('employees');
            await this.loadEmployees();
        } catch (err) {
            this.showToast(err.message || 'Registration failed', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register Account';
        }
    }

    async handleLogout() {
        try {
            await api.logout();
            this.showToast('Logged out successfully', 'info');
            this.employees = [];
            this.renderEmployeesTable([]);
            this.switchTab('auth');
        } catch (err) {
            this.showToast('Logout error: ' + err.message, 'error');
        }
    }

    /* ----------------------------------------------------
       Employee CRUD Management
    ---------------------------------------------------- */
    async loadEmployees() {
        const tbody = document.getElementById('employees-table-body');
        if (!api.isAuthenticated()) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-icon">🔒</div>
                        <div style="font-weight:600;">Authentication Required</div>
                        <div style="font-size:0.85rem; margin-top:0.3rem;">Please sign in to view and manage employee records.</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="app.switchTab('auth')">Sign In</button>
                    </td>
                </tr>
            `;
            document.getElementById('stat-employee-count').textContent = '0';
            return;
        }

        try {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-icon">⏳</div>
                        <div>Fetching employees from API...</div>
                    </td>
                </tr>
            `;

            const data = await api.getEmployees();
            this.employees = Array.isArray(data) ? data : [];
            document.getElementById('stat-employee-count').textContent = this.employees.length;
            this.renderEmployeesTable(this.employees);
        } catch (err) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <div style="color:var(--danger);">Failed to load employees</div>
                        <div style="font-size:0.85rem; margin-top:0.3rem;">${err.message}</div>
                    </td>
                </tr>
            `;
            this.showToast(err.message || 'Failed to load employees', 'error');
        }
    }

    filterEmployees() {
        const query = document.getElementById('employee-search').value.toLowerCase().trim();
        if (!query) {
            this.renderEmployeesTable(this.employees);
            return;
        }

        const filtered = this.employees.filter(emp => 
            (emp.firstname && emp.firstname.toLowerCase().includes(query)) ||
            (emp.lastname && emp.lastname.toLowerCase().includes(query)) ||
            (emp._id && emp._id.toLowerCase().includes(query))
        );

        this.renderEmployeesTable(filtered);
    }

    renderEmployeesTable(employees) {
        const tbody = document.getElementById('employees-table-body');
        if (!employees || employees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-icon">📂</div>
                        <div>No employees found.</div>
                        ${api.isEditor() ? '<button class="btn btn-primary btn-sm" style="margin-top:0.75rem;" onclick="app.openAddEmployeeModal()">+ Add First Employee</button>' : ''}
                    </td>
                </tr>
            `;
            return;
        }

        const canEdit = api.isEditor();
        const canDelete = api.isAdmin();

        tbody.innerHTML = employees.map(emp => `
            <tr>
                <td><span class="id-tag">${emp._id}</span></td>
                <td><strong>${this.escapeHtml(emp.firstname)}</strong></td>
                <td><strong>${this.escapeHtml(emp.lastname)}</strong></td>
                <td style="text-align: right;">
                    <div class="table-actions" style="justify-content: flex-end;">
                        <button class="btn btn-secondary btn-sm" onclick="app.viewEmployee('${emp._id}', '${this.escapeHtml(emp.firstname)}', '${this.escapeHtml(emp.lastname)}')">
                            👁️ View
                        </button>
                        ${canEdit ? `
                            <button class="btn btn-secondary btn-sm" onclick="app.openEditEmployeeModal('${emp._id}', '${this.escapeHtml(emp.firstname)}', '${this.escapeHtml(emp.lastname)}')">
                                ✏️ Edit
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn btn-danger btn-sm" onclick="app.deleteEmployee('${emp._id}', '${this.escapeHtml(emp.firstname)} ${this.escapeHtml(emp.lastname)}')">
                                🗑️ Delete
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    openAddEmployeeModal() {
        if (!api.isEditor()) {
            this.showToast('You need Editor or Admin permissions to add employees.', 'error');
            return;
        }
        document.getElementById('add-firstname').value = '';
        document.getElementById('add-lastname').value = '';
        document.getElementById('modal-add-employee').classList.add('active');
    }

    async handleAddEmployeeSubmit(event) {
        event.preventDefault();
        const firstname = document.getElementById('add-firstname').value.trim();
        const lastname = document.getElementById('add-lastname').value.trim();

        if (!firstname || !lastname) {
            this.showToast('Please provide both first and last name', 'error');
            return;
        }

        try {
            await api.createEmployee(firstname, lastname);
            this.showToast(`Employee ${firstname} ${lastname} created!`, 'success');
            this.closeModals();
            await this.loadEmployees();
        } catch (err) {
            this.showToast(err.message || 'Failed to create employee', 'error');
        }
    }

    openEditEmployeeModal(id, firstname, lastname) {
        if (!api.isEditor()) {
            this.showToast('You need Editor or Admin permissions to edit employees.', 'error');
            return;
        }
        document.getElementById('edit-employee-id').value = id;
        document.getElementById('edit-employee-id-display').value = id;
        document.getElementById('edit-firstname').value = firstname;
        document.getElementById('edit-lastname').value = lastname;
        document.getElementById('modal-edit-employee').classList.add('active');
    }

    async handleEditEmployeeSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('edit-employee-id').value;
        const firstname = document.getElementById('edit-firstname').value.trim();
        const lastname = document.getElementById('edit-lastname').value.trim();

        try {
            await api.updateEmployee(id, firstname, lastname);
            this.showToast(`Employee record updated!`, 'success');
            this.closeModals();
            await this.loadEmployees();
        } catch (err) {
            this.showToast(err.message || 'Failed to update employee', 'error');
        }
    }

    viewEmployee(id, firstname, lastname) {
        document.getElementById('view-emp-id').textContent = id;
        document.getElementById('view-emp-fullname').textContent = `${firstname} ${lastname}`;
        document.getElementById('modal-view-employee').classList.add('active');
    }

    async deleteEmployee(id, name) {
        if (!api.isAdmin()) {
            this.showToast('Admin role (5150) required to delete employees.', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to permanently delete employee "${name}"?`)) {
            return;
        }

        try {
            await api.deleteEmployee(id);
            this.showToast(`Employee "${name}" deleted.`, 'info');
            await this.loadEmployees();
        } catch (err) {
            this.showToast(err.message || 'Failed to delete employee', 'error');
        }
    }

    /* ----------------------------------------------------
       Admin User Governance
    ---------------------------------------------------- */
    async loadUsers() {
        const tbody = document.getElementById('users-table-body');
        if (!api.isAdmin()) {
            return;
        }

        try {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-icon">⏳</div>
                        <div>Loading users from MongoDB...</div>
                    </td>
                </tr>
            `;

            const data = await api.getUsers();
            this.users = Array.isArray(data) ? data : [];
            this.renderUsersTable(this.users);
        } catch (err) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <div style="color:var(--danger);">Failed to load users</div>
                        <div style="font-size:0.85rem; margin-top:0.3rem;">${err.message}</div>
                    </td>
                </tr>
            `;
            this.showToast(err.message || 'Failed to load users', 'error');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-icon">👥</div>
                        <div>No registered users found.</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(u => {
            const roleBadges = [];
            if (u.roles) {
                if (u.roles.Admin) roleBadges.push('<span class="badge badge-admin">Admin (5150)</span>');
                if (u.roles.Editor) roleBadges.push('<span class="badge badge-editor">Editor (1984)</span>');
                if (u.roles.User) roleBadges.push('<span class="badge badge-user">User (2001)</span>');
            }
            if (roleBadges.length === 0) {
                roleBadges.push('<span class="badge badge-guest">None</span>');
            }

            const isCurrent = u.username === api.currentUser;

            return `
                <tr>
                    <td><span class="id-tag">${u._id}</span></td>
                    <td>
                        <strong>${this.escapeHtml(u.username)}</strong>
                        ${isCurrent ? '<span style="color:var(--accent); font-size:0.8rem; margin-left:6px;">(You)</span>' : ''}
                    </td>
                    <td>
                        <div style="display:flex; gap:0.3rem; flex-wrap:wrap;">
                            ${roleBadges.join('')}
                        </div>
                    </td>
                    <td style="text-align: right;">
                        <button class="btn btn-danger btn-sm" ${isCurrent ? 'disabled title="Cannot delete yourself"' : ''} onclick="app.deleteUser('${u._id}', '${this.escapeHtml(u.username)}')">
                            🗑️ Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async deleteUser(id, username) {
        if (!confirm(`Are you sure you want to permanently delete user account "${username}"?`)) {
            return;
        }

        try {
            await api.deleteUser(id);
            this.showToast(`User account "${username}" deleted.`, 'info');
            await this.loadUsers();
        } catch (err) {
            this.showToast(err.message || 'Failed to delete user', 'error');
        }
    }

    /* ----------------------------------------------------
       Token & API Inspector
    ---------------------------------------------------- */
    updateInspector() {
        const tokenRawEl = document.getElementById('inspector-raw-token');
        const usernameEl = document.getElementById('claim-username');
        const rolesEl = document.getElementById('claim-roles');
        const iatEl = document.getElementById('claim-iat');
        const expEl = document.getElementById('claim-exp');

        const token = api.accessToken;
        if (!token) {
            tokenRawEl.textContent = 'Unauthenticated (No token stored in memory)';
            usernameEl.textContent = '-';
            rolesEl.textContent = '-';
            iatEl.textContent = '-';
            expEl.textContent = '-';
            return;
        }

        tokenRawEl.textContent = token;
        const decoded = api.decodeToken(token);
        if (decoded) {
            usernameEl.textContent = decoded.UserInfo?.username || '-';
            rolesEl.textContent = decoded.UserInfo?.roles ? JSON.stringify(decoded.UserInfo.roles) : '-';
            iatEl.textContent = decoded.iat ? new Date(decoded.iat * 1000).toLocaleTimeString() : '-';
            expEl.textContent = decoded.exp ? new Date(decoded.exp * 1000).toLocaleTimeString() : '-';
        }
    }

    startTokenTicker() {
        if (this.tokenTicker) clearInterval(this.tokenTicker);

        this.tokenTicker = setInterval(() => {
            const token = api.accessToken;
            const timerText = document.getElementById('token-timer-text');
            const timerProgress = document.getElementById('token-timer-progress');

            if (!token) {
                if (timerText) timerText.textContent = 'No Active Token';
                if (timerProgress) timerProgress.style.width = '0%';
                return;
            }

            const decoded = api.decodeToken(token);
            if (!decoded || !decoded.exp || !decoded.iat) {
                if (timerText) timerText.textContent = 'Active (Unknown exp)';
                if (timerProgress) timerProgress.style.width = '100%';
                return;
            }

            const now = Math.floor(Date.now() / 1000);
            const totalDuration = decoded.exp - decoded.iat;
            const remaining = decoded.exp - now;

            if (remaining <= 0) {
                if (timerText) {
                    timerText.textContent = 'Token Expired (Auto-refresh on next request)';
                    timerText.style.color = 'var(--danger)';
                }
                if (timerProgress) {
                    timerProgress.style.width = '0%';
                    timerProgress.style.background = 'var(--danger)';
                }
            } else {
                const percent = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));
                const minutes = Math.floor(remaining / 60);
                const seconds = remaining % 60;
                const formattedTime = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s remaining`;

                if (timerText) {
                    timerText.textContent = formattedTime;
                    timerText.style.color = remaining < 30 ? 'var(--warning)' : 'var(--accent)';
                }
                if (timerProgress) {
                    timerProgress.style.width = `${percent}%`;
                    timerProgress.style.background = remaining < 30 ? 'var(--warning)' : 'linear-gradient(90deg, var(--accent), var(--primary))';
                }
            }
        }, 1000);
    }

    async testSilentRefresh() {
        try {
            this.showToast('Sending GET /refresh with HttpOnly Cookie...', 'info');
            const data = await api.refreshToken();
            this.showToast(`Token refreshed successfully! Valid for next 15 minutes.`, 'success');
            this.updateInspector();
        } catch (err) {
            this.showToast(`Refresh failed: ${err.message}`, 'error');
        }
    }

    async testProtectedCall() {
        try {
            this.showToast('Calling GET /employees with Bearer Token...', 'info');
            const data = await api.getEmployees();
            this.showToast(`Success! Received ${data.length} employee records.`, 'success');
        } catch (err) {
            this.showToast(`Protected call failed: ${err.message}`, 'error');
        }
    }

    copyToken() {
        const token = api.accessToken;
        if (!token) {
            this.showToast('No active token to copy', 'error');
            return;
        }
        navigator.clipboard.writeText(token)
            .then(() => this.showToast('Access Token copied to clipboard!', 'success'))
            .catch(() => this.showToast('Failed to copy token', 'error'));
    }

    /* ----------------------------------------------------
       Modals & Toast Notifications
    ---------------------------------------------------- */
    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }

    showToast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `
            <span>${icon}</span>
            <div style="flex:1;">${this.escapeHtml(message)}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Instantiate and attach to window
const app = new App();
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
