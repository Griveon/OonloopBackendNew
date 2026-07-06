import mongoose, { Schema, Model } from "mongoose";
import type { INotificationDocument } from "../interfaces/notification.interface.js";

const NotificationSchema: Schema<INotificationDocument> = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        paragraph: {
            type: String,
            required: true,
            trim: true,
        },

        targetType: {
            type: String,
            enum: ["all", "users", "role"],
            required: true,
            index: true,
        },

        userIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        role: {
            type: String,
            default: "",
            trim: true,
            index: true,
        },

        imageUrl: {
            type: String,
            default: "",
            trim: true,
        },

        data: {
            type: Schema.Types.Mixed,
            default: {},
        },

        status: {
            type: String,
            enum: ["draft", "sent", "failed"],
            default: "draft",
            index: true,
        },

        totalUsers: {
            type: Number,
            default: 0,
        },

        totalTokens: {
            type: Number,
            default: 0,
        },

        successCount: {
            type: Number,
            default: 0,
        },

        failureCount: {
            type: Number,
            default: 0,
        },

        sentAt: {
            type: Date,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ targetType: 1, createdAt: -1 });

export const NotificationModel: Model<INotificationDocument> =
    mongoose.model<INotificationDocument>("Notification", NotificationSchema);