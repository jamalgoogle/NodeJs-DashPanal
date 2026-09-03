const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const connectDB = async () => {
    try {
        if (!process.env.DATABASE_URI) {
            console.warn('⚠️ DATABASE_URI not configured in .env');
            return;
        }
        await mongoose.connect(process.env.DATABASE_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.warn(`⚠️ MongoDB connection attempt failed (${err.message}). The server is still running for frontend inspection & static assets.`);
    }
}

module.exports = connectDB
