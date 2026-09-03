const User = require('../model/User');
const bcrypt = require('bcrypt');

const handleNewUser = async (req, res) => {
    const { user, pwd } = req.body;
    if (!user || !pwd) return res.status(400).json({ 'message': 'Username and password are required.' });

    try {
        // check for duplicate usernames in the db
        const duplicate = await User.findOne({ username: user }).exec();
        if (duplicate) return res.status(409).json({ "message": "User already exists. Please try logging in!" });

        // encrypt the password
        const hashedPwd = await bcrypt.hash(pwd, 10);

        // create and store the new user
        const result = await User.create({
            "username": user,
            "password": hashedPwd
        });

        res.status(201).json({ 'success': `New user ${user} created!` });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ 'message': err.message || 'Database error during registration' });
    }
}

module.exports = { handleNewUser };