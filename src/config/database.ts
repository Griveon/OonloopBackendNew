import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI as string;

export async function connectDatabase() {
    try {
        console.log("MongoDB URI:", MONGO_URI);

        await mongoose.connect(MONGO_URI);

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.log("URI:", MONGO_URI);
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}