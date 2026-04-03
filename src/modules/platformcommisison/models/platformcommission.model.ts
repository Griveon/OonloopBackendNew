import mongoose, { Schema, Model } from "mongoose";
import type { IPlatformCommissionDocument } from "../interfaces/platformcommission.interface.js";

const PlatformCommissionSchema: Schema<IPlatformCommissionDocument> =
    new Schema(
        {

            type: {
                type: String,
                enum: ["percentage", "fixed"],
                required: true,
            },

            value: {
                type: Number,
                required: true,
                min: 0,
            },

            minAmount: Number,
            maxAmount: Number,

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },

            notes: {
                type: String,
                default: "",
            },
        },
        { timestamps: true }
    );

export const PlatformCommissionModel: Model<IPlatformCommissionDocument> =
    mongoose.model<IPlatformCommissionDocument>(
        "PlatformCommission",
        PlatformCommissionSchema
    );