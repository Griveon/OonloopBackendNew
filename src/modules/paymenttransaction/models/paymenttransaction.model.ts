import mongoose, { Schema, Model } from "mongoose";
import type { IPaymentTransactionDocument } from "../interfaces/paymenttransaction.interface.js";

const PaymentTransactionSchema: Schema<IPaymentTransactionDocument> =
    new Schema(
        {
            paymentMethod: {
                type: Schema.Types.ObjectId,
                ref: "PaymentMethod",
                required: true,
            },

            providerConnection: {
                type: Schema.Types.ObjectId,
                ref: "ProviderConnection",
                required: true,
            },

            amount: {
                type: Number,
                required: true,
                min: 0,
            },

            currency: {
                type: String,
                required: true,
                default: "INR",
            },

            status: {
                type: String,
                enum: ["pending", "success", "failed", "cancelled"],
                default: "pending",
                index: true,
            },

            externalPaymentId: String,
            externalOrderId: String,

            metadata: {
                type: Schema.Types.Mixed,
            },

            paidAt: Date,
            failedAt: Date,

            isActive: {
                type: Boolean,
                default: true,
            },
        },
        { timestamps: true }
    );


export const PaymentTransactionModel: Model<IPaymentTransactionDocument> =
    mongoose.model<IPaymentTransactionDocument>(
        "PaymentTransaction",
        PaymentTransactionSchema
    );