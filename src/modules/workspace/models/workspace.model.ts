import mongoose, { Schema, Model } from "mongoose";
import type { IWorkspaceDocument } from "../interfaces/workspace.interface.js";

const WorkspaceSchema: Schema<IWorkspaceDocument> = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        description: {
            type: String,
            default: "",
            trim: true,
        },

        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
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

export const WorkspaceModel: Model<IWorkspaceDocument> =
    mongoose.model<IWorkspaceDocument>("Workspace", WorkspaceSchema);