const User = require('../model/User');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users || []);
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

const deleteUser = async (req, res) => {
    if (!req?.body?.id) return res.status(400).json({ "message": 'User ID required' });
    try {
        const user = await User.findOne({ _id: req.body.id }).exec();
        if (!user) {
            return res.status(404).json({ 'message': `User ID ${req.body.id} not found` });
        }
        const result = await user.deleteOne();
        res.json(result);
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

const getUser = async (req, res) => {
    if (!req?.params?.id) return res.status(400).json({ "message": 'User ID required' });
    try {
        const user = await User.findOne({ _id: req.params.id }).select('-password').exec();
        if (!user) {
            return res.status(404).json({ 'message': `User ID ${req.params.id} not found` });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

module.exports = {
    getAllUsers,
    deleteUser,
    getUser
}