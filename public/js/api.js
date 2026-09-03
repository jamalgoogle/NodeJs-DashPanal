/**
 * API Client for NodeJs-Full-Architecture
 * Handles JWT access tokens, auto-refresh on 401/403, and role permissions.
 */

const ROLES = {
    Admin: 5150,
    Editor: 1984,
    User: 2001
};

class ApiService {
    constructor() {
        this.accessToken = null;
        this.currentUser = null;
        this.roles = [];
        this.refreshPromise = null;
    }

    /**
     * Decode standard JWT payload
     */
    decodeToken(token) {
        if (!token) return null;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Error decoding token:', e);
            return null;
        }
    }

    setSession(accessToken, roles) {
        this.accessToken = accessToken;
        if (roles && Array.isArray(roles)) {
            this.roles = roles;
        }
        if (accessToken) {
            const decoded = this.decodeToken(accessToken);
            if (decoded && decoded.UserInfo) {
                this.currentUser = decoded.UserInfo.username;
                if ((!roles || roles.length === 0) && decoded.UserInfo.roles) {
                    this.roles = decoded.UserInfo.roles;
                }
            }
        } else {
            this.currentUser = null;
            this.roles = [];
        }
        // Notify listeners if any
        window.dispatchEvent(new CustomEvent('auth-change', { 
            detail: { 
                user: this.currentUser, 
                roles: this.roles, 
                token: this.accessToken 
            } 
        }));
    }

    clearSession() {
        this.setSession(null, []);
    }

    hasRole(roleId) {
        return this.roles && this.roles.includes(roleId);
    }

    isAdmin() {
        return this.hasRole(ROLES.Admin);
    }

    isEditor() {
        return this.hasRole(ROLES.Editor) || this.hasRole(ROLES.Admin);
    }

    isAuthenticated() {
        return Boolean(this.accessToken);
    }

    /**
     * Register a new user
     */
    async register(user, pwd) {
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, pwd })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.message || 'Registration failed');
        }
        return data;
    }

    /**
     * Login user and store accessToken in memory
     */
    async login(user, pwd) {
        const res = await fetch('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // receives HttpOnly cookie with refresh token
            body: JSON.stringify({ user, pwd })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }
        this.setSession(data.accessToken, data.roles);
        return data;
    }

    /**
     * Silent token refresh using HttpOnly cookie
     */
    async refreshToken() {
        // Prevent multiple concurrent refresh requests
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
            try {
                const res = await fetch('/refresh', {
                    method: 'GET',
                    credentials: 'include'
                });
                if (!res.ok) {
                    this.clearSession();
                    throw new Error('Session expired or refresh token invalid');
                }
                const data = await res.json();
                this.setSession(data.accessToken, data.roles);
                return data;
            } catch (err) {
                this.clearSession();
                throw err;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    /**
     * Logout and clear cookie on server
     */
    async logout() {
        try {
            await fetch('/logout', {
                method: 'GET',
                credentials: 'include'
            });
        } catch (err) {
            console.warn('Logout request failed:', err);
        } finally {
            this.clearSession();
        }
    }

    /**
     * Authenticated fetch wrapper with automatic token refresh on 401/403
     */
    async request(endpoint, options = {}) {
        options.headers = options.headers || {};
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        if (this.accessToken) {
            options.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        options.credentials = 'include';

        let res = await fetch(endpoint, options);

        // If access token expired or invalid (401 or 403) and we had a token, try silent refresh once
        if ((res.status === 401 || res.status === 403) && this.accessToken) {
            console.log('Token rejected or expired (401/403). Attempting automatic refresh...');
            try {
                const refreshData = await this.refreshToken();
                if (refreshData && refreshData.accessToken) {
                    options.headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
                    res = await fetch(endpoint, options);
                }
            } catch (refreshErr) {
                console.warn('Token auto-refresh failed:', refreshErr);
                throw new Error('Session expired. Please log in again.');
            }
        }

        // Handle empty content responses (204)
        if (res.status === 204) {
            return null;
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const errorMsg = data.message || `Request failed with status ${res.status}`;
            const error = new Error(errorMsg);
            error.status = res.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    // Employee Endpoints
    async getEmployees() {
        return this.request('/employees', { method: 'GET' });
    }

    async getEmployee(id) {
        return this.request(`/employees/${id}`, { method: 'GET' });
    }

    async createEmployee(firstname, lastname) {
        return this.request('/employees', {
            method: 'POST',
            body: { firstname, lastname }
        });
    }

    async updateEmployee(id, firstname, lastname) {
        return this.request('/employees', {
            method: 'PUT',
            body: { id, firstname, lastname }
        });
    }

    async deleteEmployee(id) {
        return this.request('/employees', {
            method: 'DELETE',
            body: { id }
        });
    }

    // User Management Endpoints (Admin only)
    async getUsers() {
        return this.request('/users', { method: 'GET' });
    }

    async getUser(id) {
        return this.request(`/users/${id}`, { method: 'GET' });
    }

    async deleteUser(id) {
        return this.request('/users', {
            method: 'DELETE',
            body: { id }
        });
    }
}

const api = new ApiService();
window.api = api;
window.ROLES = ROLES;
