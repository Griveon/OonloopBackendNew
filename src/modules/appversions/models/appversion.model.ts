import mongoose, { Schema, Model } from "mongoose";
import type { IAppVersionDocument } from "../interfaces/appversion.interface.js";
import { AppPlatform } from "../constants/appversion.constant.js";

const AppVersionSchema: Schema<IAppVersionDocument> = new Schema(
    {
        platform: {
            type: String,
            enum: Object.values(AppPlatform),
            required: true,
            trim: true,
            lowercase: true,
        },
        latestVersion: {
            type: String,
            required: true,
            trim: true,
        },
        latestBuildNumber: {
            type: Number,
            required: true,
            min: 1,
        },
        minimumSupportedVersion: {
            type: String,
            required: true,
            trim: true,
        },
        minimumSupportedBuildNumber: {
            type: Number,
            required: true,
            min: 1,
        },
        forceUpdate: {
            type: Boolean,
            default: false,
        },
        storeUrl: {
            type: String,
            default: "",
            trim: true,
        },
        message: {
            type: String,
            default: "",
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        // Extensible optional fields for future roadmap
        maintenanceMode: {
            type: Boolean,
            default: false,
        },
        recommendedUpdate: {
            type: Boolean,
            default: false,
        },
        rolloutPercentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 100,
        },
        deprecatedBuilds: {
            type: [Number],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// Enforce that only one active configuration exists per platform
AppVersionSchema.index(
    { platform: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true },
    }
);

// Compound index for querying active version config by platform
AppVersionSchema.index({ platform: 1, isActive: 1 });

export const AppVersionModel: Model<IAppVersionDocument> =
    mongoose.model<IAppVersionDocument>("AppVersion", AppVersionSchema);