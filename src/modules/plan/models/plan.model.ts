import mongoose, { Schema, Model } from "mongoose";
import type { IPlanDocument } from "../interfaces/plan.interface.js";
import { CurrencyModel } from "../../currency/models/currency.model.js";

const PlanSchema: Schema<IPlanDocument> = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },

        displayName: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: Schema.Types.ObjectId,
            ref: "Currency",
            required: true,
        },

        billingCycle: {
            type: String,
            enum: ["monthly", "yearly"],
            required: true,
            default: "monthly",
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

export const PlanModel: Model<IPlanDocument> =
    mongoose.model<IPlanDocument>("Plan", PlanSchema);