const User = require('../model/User');
const bcrypt = require('bcrypt');

const handleNewUser = async (req, res) => {
    // 1. استخراج roles بجانب user و pwd من جسم الطلب
    const { user, pwd, roles } = req.body;
    if (!user || !pwd) return res.status(400).json({ 'message': 'Username and password are required.' });

    try {
        // check for duplicate usernames in the db
        const duplicate = await User.findOne({ username: user }).exec();
        if (duplicate) return res.status(409).json({ "message": "User already exists. Please try logging in!" });

        // encrypt the password
        const hashedPwd = await bcrypt.hash(pwd, 10);

        // 2. إذا تم إرسال roles استخدمها، وإلا قم بضبط القيمة الافتراضية كـ User (2001)
        const userRoles = roles ? roles : { "User": 2001 };

        // create and store the new user
        const result = await User.create({
            "username": user,
            "password": hashedPwd,
            "roles": userRoles
        });

        res.status(201).json({ 'success': `New user ${user} created!` });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ 'message': err.message || 'Database error during registration' });
    }
}

module.exports = { handleNewUser };