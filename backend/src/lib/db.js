import mongo from 'mongoose';

export const connectDB = async () => {
    try {
        const conn = await mongo.connect(process.env.MONGO_URI);
        console.log(`MongoDB connected ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1); // Exit the process with failure
    }
}