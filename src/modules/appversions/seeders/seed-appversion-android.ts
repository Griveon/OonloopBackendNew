import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { AppVersionModel } from "../models/appversion.model.js";
import { AppPlatform } from "../constants/appversion.constant.js";

/**
 * Seeds the default Android app version configuration into MongoDB
 * if one does not already exist.
 */
export const seedAndroidAppVersion = async (): Promise<void> => {
    try {
        // Ensure database connection is ready if run independently
        if (mongoose.connection.readyState === 0) {
            const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
            if (!mongoUri) {
                console.warn(
                    "[Seed] MONGO_URI is not configured. Skipping Android AppVersion seed."
                );
                return;
            }
            await mongoose.connect(mongoUri);
        }

        const androidConfig = {
            platform: AppPlatform.ANDROID,
            latestVersion: "1.0.0",
            latestBuildNumber: 1,
            minimumSupportedVersion: "1.0.0",
            minimumSupportedBuildNumber: 1,
            forceUpdate: false,
            storeUrl:
                "https://play.google.com/store/apps/details?id=com.example.app",
            message: "A new version of the app is available.",
            isActive: true,
        };

        const result = await AppVersionModel.findOneAndUpdate(
            { platform: AppPlatform.ANDROID },
            { $setOnInsert: androidConfig },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            }
        );
        console.log("[Seed] Default Android AppVersion seeded successfully.");
    } catch (error) {
        console.error("[Seed] Error seeding Android AppVersion:", error);
    }
};

// Allow running as a standalone script (e.g., via tsx)
const isDirectRun =
    process.argv[1]?.replace(/\\/g, "/").includes("seed-appversion-android") ?? false;

if (isDirectRun) {
    (async () => {
        try {
            const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
            if (!mongoUri) {
                throw new Error("MONGO_URI is not configured");
            }
            console.log("Connecting to MongoDB for standalone seed...");
            await mongoose.connect(mongoUri);
            await seedAndroidAppVersion();
        } catch (err) {
            console.error("Standalone seed execution failed:", err);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
            console.log("MongoDB disconnected.");
        }
    })();
}
