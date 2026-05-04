import mongoose, { Schema, Model } from "mongoose";
import type { IOrderDocument } from "../interfaces/order.interface.js";

const orderItemSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        variant: {
            type: Schema.Types.ObjectId,
        },

        name: { type: String, required: true },
        sku: String,

        price: {
            type: Number,
            required: true,
        },

        mrp: Number,

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        images: [
            {
                url: String,
            },
        ],

        total: {
            type: Number,
            required: true,
        },
    },
    { _id: false }
);

const addressSchema = new Schema(
    {
        name: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: "India" },
    },
    { _id: false }
);

const orderSchema = new Schema<IOrderDocument>(
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
        },

        orderNumber: {
            type: String,
            required: true,
            unique: true,
        },

        items: {
            type: [orderItemSchema],
            required: true,
        },

        billingAddress: addressSchema,
        shippingAddress: addressSchema,

        paymentMethod: {
            type: Schema.Types.ObjectId,
            ref: "PaymentMethod",
            required: true,
        },

        paymentTransaction: {
            type: Schema.Types.ObjectId,
            ref: "PaymentTransaction",
        },

        subtotal: {
            type: Number,
            required: true,
        },

        discount: {
            type: Number,
            default: 0,
        },

        gstRuleId: {
            type: Schema.Types.ObjectId,
            ref: "GSTRule",
        },

        gstAmount: {
            type: Number,
            default: 0,
        },

        shippingCharge: {
            type: Number,
            default: 0,
        },

        totalAmount: {
            type: Number,
            required: true,
        },

        status: {
            type: String,
            enum: [
                "pending",
                "placed",
                "confirmed",
                "packed",
                "shipped",
                "delivered",
                "cancelled",
                "returned",
            ],
            default: "pending",
            index: true,
        },

        paymentStatus: {
            type: String,
            enum: ["pending", "success", "failed", "refunded"],
            default: "pending",
            index: true,
        },

        tracking: String,
        courierName: String,

        shippedAt: Date,
        deliveredAt: Date,
        cancelledAt: Date,

        notes: String,

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

orderSchema.virtual("totalItems").get(function () {
    return this.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
});

export const OrderModel: Model<IOrderDocument> =
    mongoose.model<IOrderDocument>("Order", orderSchema);