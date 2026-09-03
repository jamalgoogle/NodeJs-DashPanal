const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const handleLogin = async (req, res) => {
    const { user, pwd } = req.body;
    if (!user || !pwd) return res.status(400).json({ 'message': 'Username and password are required.' });

    try {
        const foundUser = await User.findOne({ username: user }).exec();
        if (!foundUser) return res.status(401).json({ "message": "Invalid username or password." }); // Unauthorized 
        
        // evaluate password 
        const match = await bcrypt.compare(pwd, foundUser.password);

        if (match) {
            const roles = Object.values(foundUser.roles).filter(Boolean);
            // create JWTs
            const accessToken = jwt.sign(   
                {
                    "UserInfo": {
                        "username": foundUser.username,
                        "roles": roles
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            );
            const refreshToken = jwt.sign(
                { "username": foundUser.username },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '7d' }
            );
            // Saving refreshToken with current user
            foundUser.refreshToken = refreshToken;
            await foundUser.save();

            // Creates Cookie with refresh token
            res.cookie('jwt', refreshToken, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', 
                maxAge: 24 * 60 * 60 * 1000 
            });

            // Send authorization roles and access token to user
            res.json({ roles, accessToken });

        } else {
            res.status(401).json({ "message": "Invalid username or password." });
        }
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ 'message': err.message || 'Database error during login' });
    }
}

module.exports = { handleLogin };