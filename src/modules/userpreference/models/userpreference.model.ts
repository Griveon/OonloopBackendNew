import mongoose, { Schema, Model } from "mongoose";
import type { IUserPreferenceDocument } from "../interfaces/userpreference.interface.js";

const UserPreferenceSchema = new Schema<IUserPreferenceDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        values: {
            type: Map,
            of: Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

export const UserPreferenceModel: Model<IUserPreferenceDocument> =
    mongoose.model<IUserPreferenceDocument>("UserPreference", UserPreferenceSchema);