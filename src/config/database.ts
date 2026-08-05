import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import dns from "dns/promises";

const MONGO_URI = process.env.MONGO_URI as string;

export async function connectDatabase() {
    try {

try {
    const result = await dns.resolveSrv("_mongodb._tcp.cluster0.wrlvkfo.mongodb.net");
    console.log(result);
} catch (err) {
    console.error(err);
}
        console.log("URI:", process.env.MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.log("URI:", process.env.MONGO_URI);
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}