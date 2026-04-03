import mongoose, { Schema, Model } from "mongoose";
import type { IFeatureDocument } from "../interfaces/feature.interface.js";

const FeatureSchema: Schema<IFeatureDocument> = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
        },

        type: {
            type: String,
            enum: ["number", "boolean"],
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

export const FeatureModel: Model<IFeatureDocument> =
    mongoose.model<IFeatureDocument>("Feature", FeatureSchema);