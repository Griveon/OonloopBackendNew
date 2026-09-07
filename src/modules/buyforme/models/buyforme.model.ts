import mongoose, { Schema, Model } from "mongoose";
import type { IBuyForMeRequestDocument } from "../interfaces/buyforme.interface.js";

const geoPointSchema = new Schema(
    {
        lat: { type: Number, required: true, min: -90, max: 90 },
        lng: { type: Number, required: true, min: -180, max: 180 },
    },
    { _id: false }
);

const deliverySchema = new Schema(
    {
        fullName: String,
        mobileNumber: { type: String, required: true, trim: true },
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: "India" },
        location: { type: geoPointSchema, required: true },
    },
    { _id: false }
);

const buyForMeSchema = new Schema<IBuyForMeRequestDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        requestNumber: { type: String, required: true, unique: true },

        sourceMode: {
            type: String,
            enum: ["no_preference", "oonloop_store", "named_store"],
            default: "no_preference",
        },
        preferredStore: {
            storeId: { type: Schema.Types.ObjectId, ref: "VendorProfile" },
            storeName: { type: String, trim: true },
        },
        radiusKm: { type: Number, default: 3 },

        delivery: { type: deliverySchema },

        budget: { type: Number, min: 0 },
        serviceFee: { type: Number, default: 49 },
        gstPercent: { type: Number, default: 18 },
        gstAmount: { type: Number, default: 0 },
        totalPayable: { type: Number, default: 0 },

        actualBillAmount: { type: Number },
        refundAmount: { type: Number },

        status: {
            type: String,
            enum: [
                "draft",
                "submitted",
                "confirmed",
                "finding_shopper",
                "shopper_assigned",
                "shopping",
                "ready",
                "out_for_delivery",
                "delivered",
                "cancelled",
            ],
            default: "draft",
            index: true,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "partially_refunded", "refunded"],
            default: "pending",
            index: true,
        },
        paymentTransaction: { type: Schema.Types.ObjectId, ref: "PaymentTransaction" },

        shopper: { type: Schema.Types.ObjectId, ref: "User", index: true },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const BuyForMeRequestModel: Model<IBuyForMeRequestDocument> =
    mongoose.models.BuyForMeRequest ||
    mongoose.model<IBuyForMeRequestDocument>("BuyForMeRequest", buyForMeSchema);
