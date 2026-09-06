import mongoose, { Schema, Model } from "mongoose";
import type { IPreorderOrderDocument } from "../interfaces/preorder.interface.js";
import {
    PREORDER_FULFILLMENT_MODES,
    PREORDER_ORDER_STATUSES,
    PREORDER_PAYMENT_STATUSES,
} from "../constants/preorder.constants.js";

const geoPointSchema = new Schema(
    {
        lat: { type: Number, required: true, min: -90, max: 90 },
        lng: { type: Number, required: true, min: -180, max: 180 },
    },
    { _id: false }
);

const itemSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        name: { type: String, required: true },
        image: { type: String, default: "" },
        variantId: { type: Schema.Types.ObjectId },
        variantLabel: { type: String, default: "" },
        price: { type: Number, required: true },
        qty: { type: Number, required: true, min: 1 },
        total: { type: Number, required: true },
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

const sameDaySchema = new Schema(
    {
        readyWithinHours: { type: Number, required: true },
        promisedReadyAt: { type: Date, required: true },
    },
    { _id: false }
);

const scheduledSchema = new Schema(
    {
        date: { type: Date, required: true },
        slotLabel: { type: String, required: true },
        slotStart: { type: String, required: true },
        slotEnd: { type: String, required: true },
    },
    { _id: false }
);

const trackingSchema = new Schema(
    {
        title: String,
        status: String,
        remark: String,
        updatedByRole: String,
        updatedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const preorderOrderSchema = new Schema<IPreorderOrderDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        vendor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        orderNumber: { type: String, required: true, unique: true },

        items: {
            type: [itemSchema],
            required: true,
            validate: {
                validator: (v: unknown[]) => v.length >= 1,
                message: "A preorder must have at least one item",
            },
        },

        subtotal: { type: Number, required: true },
        platformFee: { type: Number, default: 0 },
        feeGst: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 0 }, // display only
        totalAmount: { type: Number, required: true },

        fulfillmentMode: {
            type: String,
            enum: PREORDER_FULFILLMENT_MODES,
            required: true,
            index: true,
        },

        sameDay: { type: sameDaySchema },
        scheduled: { type: scheduledSchema },

        delivery: { type: deliverySchema, required: true },

        status: {
            type: String,
            enum: PREORDER_ORDER_STATUSES,
            default: "pending_payment",
            index: true,
        },
        paymentStatus: {
            type: String,
            enum: PREORDER_PAYMENT_STATUSES,
            default: "pending",
            index: true,
        },
        paymentTransaction: {
            type: Schema.Types.ObjectId,
            ref: "PaymentTransaction",
        },

        driver: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        driverAssignedAt: Date,

        trackingHistory: { type: [trackingSchema], default: [] },

        placedAt: Date,
        readyAt: Date,
        deliveredAt: Date,
        cancelledAt: Date,

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const PreorderOrderModel: Model<IPreorderOrderDocument> =
    mongoose.models.PreorderOrder ||
    mongoose.model<IPreorderOrderDocument>(
        "PreorderOrder",
        preorderOrderSchema
    );
