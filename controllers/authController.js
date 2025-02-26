const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const handleLogin = async (req, res) => {
    //receieve the name and password from the body
    const { user, pwd } = req.body;
    if (!user || !pwd) return res.status(400).json({ 'message': 'Username and password are required.' }); //check ir its empty

    const foundUser = await User.findOne({ username: user }).exec();
    if (!foundUser) return res.sendStatus(401).json({"massage" : "you are not logged in , try register ! "}); //Unauthorized 
    // evaluate password 
    const match = await bcrypt.compare(pwd, foundUser.password); // 123456789 = hh38*83mt8asda$Y%Y(y%*&Y%(A%

    if (match) {
        const roles = Object.values(foundUser.roles).filter(Boolean); // true
        // create JWTs
        const accessToken = jwt.sign(   
            {
                "UserInfo": {
                    "username": foundUser.username,
                    "roles": roles
                }
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );
        const refreshToken = jwt.sign(
            { "username": foundUser.username },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' } // after the refresh token expires after 1 weak , user will be logged out
        );
        // Saving refreshToken with current user
        foundUser.refreshToken = refreshToken;
        const result = await foundUser.save();
        console.log(result);
        console.log(roles);

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

        // Send authorization roles and access token to user
        res.json({ roles, accessToken });

    } else {
        res.sendStatus(401);
    }
}

module.exports = { handleLogin };