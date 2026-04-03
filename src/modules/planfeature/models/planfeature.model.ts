import mongoose, { Schema, Model } from "mongoose";
import type { IPlanFeatureDocument } from "../interfaces/planfeature.interface.js";

const PlanFeatureSchema: Schema<IPlanFeatureDocument> = new Schema(
    {
        plan: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
            index: true,
        },

        feature: {
            type: Schema.Types.ObjectId,
            ref: "Feature",
            required: true,
            index: true,
        },

        value: {
            type: Schema.Types.Mixed,
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

// Unique combination of plan + feature
PlanFeatureSchema.index({ plan: 1, feature: 1 }, { unique: true });

export const PlanFeatureModel: Model<IPlanFeatureDocument> =
    mongoose.model<IPlanFeatureDocument>("PlanFeature", PlanFeatureSchema);