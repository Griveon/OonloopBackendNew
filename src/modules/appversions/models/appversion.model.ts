import mongoose, { Schema, Model } from "mongoose";
import type { IAppVersionDocument } from "../interfaces/appversion.interface.js";

const AppVersionSchema: Schema<IAppVersionDocument> = new Schema(
    {
        platform: {
            type: String,
            enum: ["android", "ios"],
            required: true,
            unique: true,
            index: true,
        },

        latestVersionCode: {
            type: Number,
            required: true,
            min: 1,
        },

        latestVersionName: {
            type: String,
            required: true,
            trim: true,
        },

        minimumVersionCode: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },

        forceUpdate: {
            type: Boolean,
            default: false,
        },

        updateTitle: {
            type: String,
            default: "Update Available",
            trim: true,
        },

        updateMessage: {
            type: String,
            default: "A new version of the app is available. Please update to continue.",
            trim: true,
        },

        playStoreUrl: {
            type: String,
            default: "",
            trim: true,
        },

        appStoreUrl: {
            type: String,
            default: "",
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

export const AppVersionModel: Model<IAppVersionDocument> =
    mongoose.model<IAppVersionDocument>(
        "AppVersion",
        AppVersionSchema
    );