import mongoose, { Schema, Model } from "mongoose";
import type { IPaymentMethodDocument } from "../interfaces/paymentmethod.interface.js";

const PaymentMethodSchema = new Schema<IPaymentMethodDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        type: {
            type: String,
            enum: ["cod", "online"],
            required: true,
        },

        providerConnectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProviderConnection",
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        priority: {
            type: Number,
            default: 1,
        },

        charges: {
            type: {
                type: String,
                enum: ["percentage", "flat"],
            },
            value: Number,
        },

        rules: {
            minAmount: Number,
            maxAmount: Number,
            allowedPincodes: [String],
            blockedPincodes: [String],
        },

        meta: {
            type: Schema.Types.Mixed,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export const PaymentMethodModel: Model<IPaymentMethodDocument> =
    mongoose.model<IPaymentMethodDocument>(
        "PaymentMethod",
        PaymentMethodSchema
    );