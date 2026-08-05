import mongoose, { Schema, Model } from "mongoose";
import type { IPersonalShopperBookingDocument } from "../interfaces/personalshopper.interface.js";
import { SHOPPING_ASSISTANCE_OPTIONS } from "../constants/personalshopper.constants.js";

const geoPointSchema = new Schema(
    {
        lat: { type: Number, required: true, min: -90, max: 90 },
        lng: { type: Number, required: true, min: -180, max: 180 },
    },
    { _id: false }
);

const storeSchema = new Schema(
    {
        sequence: { type: Number, required: true },
        storeName: { type: String, trim: true, default: "" },
        location: { type: geoPointSchema, required: true },
        itemsToBuy: { type: String, required: true, trim: true },
        image: { type: String, default: "" },
        distanceFromPrevKm: { type: Number, default: 0 },
    },
    { _id: true }
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

const estimateSchema = new Schema(
    {
        travelMinutes: { type: Number, required: true },
        shoppingMinutes: { type: Number, required: true },
        totalMinutes: { type: Number, required: true },
        totalDistanceKm: { type: Number, default: 0 },
        shopperFee: { type: Number, required: true },
        breakdown: { type: String, default: "" },
    },
    { _id: false }
);

const bookingSchema = new Schema<IPersonalShopperBookingDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        bookingNumber: {
            type: String,
            required: true,
            unique: true,
        },

        stores: {
            type: [storeSchema],
            required: true,
            validate: {
                validator: (v: unknown[]) => v.length >= 1 && v.length <= 5,
                message: "A booking must have between 1 and 5 stores",
            },
        },

        delivery: { type: deliverySchema, required: true },

        shoppingAssistance: {
            type: String,
            enum: SHOPPING_ASSISTANCE_OPTIONS,
            required: true,
        },

        estimate: { type: estimateSchema, required: true },

        actualShopperFee: { type: Number },
        productCost: { type: Number, default: 0 },
        additionalCharges: {
            transportation: { type: Number, default: 0 },
            travel: { type: Number, default: 0 },
            notes: { type: String, default: "" },
        },

        // Assigned rider (User with role "driver")
        driver: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        driverAssignedAt: Date,

        // Delivery tracking
        findingRiderSince: Date,
        riderStartLocation: geoPointSchema,
        deliveryStartedAt: Date,

        // Real rider coordinates (prod)
        riderLiveLocation: geoPointSchema,
        riderLocationUpdatedAt: Date,

        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "shopping",
                "finding_rider",
                "rider_assigned",
                "heading_to_store",
                "returning_to_customer",
                "delivered",
                "cancelled",
            ],
            default: "pending",
            index: true,
        },

        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "refunded", "failed"],
            default: "pending",
            index: true,
        },

        paymentTransaction: {
            type: Schema.Types.ObjectId,
            ref: "PaymentTransaction",
        },

        deliveredAt: Date,
        cancelledAt: Date,

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const PersonalShopperBookingModel: Model<IPersonalShopperBookingDocument> =
    mongoose.models.PersonalShopperBooking ||
    mongoose.model<IPersonalShopperBookingDocument>(
        "PersonalShopperBooking",
        bookingSchema
    );
