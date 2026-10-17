import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI as string;

export async function connectDatabase() {
    try {
        console.log("MongoDB URI:", MONGO_URI);

        const maxPoolSize = Number(process.env.MONGO_MAX_POOL_SIZE || 50);
        const minPoolSize = Number(process.env.MONGO_MIN_POOL_SIZE || 10);

        await mongoose.connect(MONGO_URI, {
            maxPoolSize,
            minPoolSize,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.log("URI:", MONGO_URI);
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}