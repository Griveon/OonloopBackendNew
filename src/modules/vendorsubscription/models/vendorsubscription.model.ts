import mongoose, { Schema, Model } from "mongoose";
import type { IVendorSubscriptionDocument } from "../interfaces/vendorsubscription.interface.js";

const VendorSubscriptionSchema: Schema<IVendorSubscriptionDocument> =
    new Schema(
        {
            user: {
                type: Schema.Types.ObjectId,
                ref: "User",
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
                default: "pending",
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

            billingCycle: {
                type: String,
                enum: ["monthly", "yearly"],
                required: true,
            },

            autoRenew: {
                type: Boolean,
                default: true,
            },

            features: [
                {
                    feature: {
                        type: Schema.Types.ObjectId,
                        ref: "Feature",
                        required: true,
                    },
                    value: {
                        type: Schema.Types.Mixed,
                        required: true,
                    },
                },
            ],

            paymentTransactionId: {
                type: Schema.Types.ObjectId,
                ref: "PaymentTransaction",
            },

            externalPaymentId: String,

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },

            cancelledAt: Date,
            expiredAt: Date,
        },
        {
            timestamps: true,
        }
    );

VendorSubscriptionSchema.index(
    { user: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "active" } }
);

export const VendorSubscriptionModel: Model<IVendorSubscriptionDocument> =
    mongoose.model<IVendorSubscriptionDocument>(
        "VendorSubscription",
        VendorSubscriptionSchema
    );