import mongoose, { Schema, Model } from "mongoose";
import type { IFirebaseTokenDocument } from "../interfaces/firebasetoken.interface.js";

const FirebaseTokenSchema: Schema<IFirebaseTokenDocument> = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        token: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            index: true,
        },

        platform: {
            type: String,
            enum: ["android", "ios", "web"],
            required: true,
        },

        deviceId: {
            type: String,
            default: "",
            trim: true,
            index: true,
        },

        deviceName: {
            type: String,
            default: "",
            trim: true,
        },

        appVersion: {
            type: String,
            default: "",
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        lastUsedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

FirebaseTokenSchema.index({ user: 1, isActive: 1 });
FirebaseTokenSchema.index({ user: 1, deviceId: 1 });

export const FirebaseTokenModel: Model<IFirebaseTokenDocument> =
    mongoose.model<IFirebaseTokenDocument>("FirebaseToken", FirebaseTokenSchema);