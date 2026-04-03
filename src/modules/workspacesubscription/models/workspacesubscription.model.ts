import mongoose, { Schema, Model } from "mongoose";
import type { IWorkspaceSubscriptionDocument } from "../interfaces/workspacesubscription.interface.js";

const WorkspaceSubscriptionSchema: Schema<IWorkspaceSubscriptionDocument> = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        workspace: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },

        plan: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
        },

        status: {
            type: String,
            enum: ["active", "cancelled", "expired", "pending"],
            default: "active",
            index: true,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
            index: true,
        },

        autoRenew: {
            type: Boolean,
            default: true,
        },

        paymentId: {
            type: String,
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

WorkspaceSubscriptionSchema.index(
    { workspace: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "active" } }
);

export const WorkspaceSubscriptionModel: Model<IWorkspaceSubscriptionDocument> =
    mongoose.model<IWorkspaceSubscriptionDocument>(
        "WorkspaceSubscription",
        WorkspaceSubscriptionSchema
    );