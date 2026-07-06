import mongoose, { Schema, Model } from "mongoose";
import type { IOrderDocument } from "../interfaces/order.interface.js";

const orderItemSchema = new Schema(
    {
        vendor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        variant: {
            type: Schema.Types.ObjectId,
            default: null,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        sku: {
            type: String,
            trim: true,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        mrp: {
            type: Number,
            min: 0,
            default: 0,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        images: [
            {
                url: {
                    type: String,
                    trim: true,
                },
            },
        ],

        total: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);
const addressLocationSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },

        /**
         * GeoJSON format:
         * coordinates: [longitude, latitude]
         */
        coordinates: {
            type: [Number],
            default: undefined,
            validate: {
                validator: function (value: number[]) {
                    if (!value) return true;
                    return (
                        Array.isArray(value) &&
                        value.length === 2 &&
                        typeof value[0] === "number" &&
                        typeof value[1] === "number"
                    );
                },
                message: "Location coordinates must be [longitude, latitude]",
            },
        },
    },
    { _id: false }
);

const addressSchema = new Schema(
    {
        name: {
            type: String,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        addressLine1: {
            type: String,
            trim: true,
        },

        addressLine2: {
            type: String,
            trim: true,
        },

        landmark: {
            type: String,
            trim: true,
        },

        city: {
            type: String,
            trim: true,
        },

        state: {
            type: String,
            trim: true,
        },

        pincode: {
            type: String,
            trim: true,
        },

        postalCode: {
            type: String,
            trim: true,
        },

        country: {
            type: String,
            default: "India",
            trim: true,
        },

        latitude: {
            type: Number,
            default: null,
        },

        longitude: {
            type: Number,
            default: null,
        },

        lat: {
            type: Number,
            default: null,
        },

        lng: {
            type: Number,
            default: null,
        },

        fullAddress: {
            type: String,
            trim: true,
        },

        location: {
            type: addressLocationSchema,
            default: undefined,
        },
    },
    { _id: false }
);

const trackingHistorySchema = new Schema(
    {
        title: {
            type: String,
            trim: true,
        },

        status: {
            type: String,
            required: true,
            trim: true,
        },

        remark: {
            type: String,
            trim: true,
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        updatedByRole: {
            type: String,
            enum: ["user", "vendor", "driver", "admin", "system"],
            default: "system",
        },

        updatedAt: {
            type: Date,
            default: Date.now,
        },
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
            required: false,
            index: true,
        },

        vendors: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                index: true,
            },
        ],

        orderType: {
            type: String,
            enum: ["single_vendor", "multi_vendor"],
            default: "single_vendor",
            index: true,
        },

        vendorOrderCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        orderNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: function (items: any[]) {
                    return Array.isArray(items) && items.length > 0;
                },
                message: "Order must contain at least one item",
            },
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
            min: 0,
        },

        discount: {
            type: Number,
            default: 0,
            min: 0,
        },

        gstRuleId: {
            type: Schema.Types.ObjectId,
            ref: "GSTRule",
        },

        gstAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        shippingCharge: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        paymentStatus: {
            type: String,
            enum: ["pending", "success", "failed", "refunded"],
            default: "success",
            index: true,
        },

        paymentMode: {
            type: String,
            enum: ["cod", "online"],
            default: "online",
        },

        status: {
            type: String,
            enum: [
                "pending",
                "placed",
                "processing",
                "partially_ready",
                "ready_for_pickup",
                "partially_shipped",
                "shipped",
                "partially_delivered",
                "delivered",
                "partially_cancelled",
                "cancelled",
                "returned",
            ],
            default: "placed",
            index: true,
        },

        trackingHistory: {
            type: [trackingHistorySchema],
            default: [],
        },

        cancellationReason: {
            type: String,
            trim: true,
        },

        failureReason: {
            type: String,
            trim: true,
        },

        notes: {
            type: String,
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

orderSchema.virtual("totalItems").get(function () {
    return this.items.reduce((sum: number, item: any) => {
        return sum + Number(item.quantity || 0);
    }, 0);
});

orderSchema.pre("validate", function () {
    const order: any = this;

    if (Array.isArray(order.items) && order.items.length > 0) {
        const vendorIds = [
            ...new Set(
                order.items
                    .map((item: any) => item.vendor?.toString())
                    .filter(Boolean)
            ),
        ];

        order.vendors = vendorIds;
        order.vendorOrderCount = vendorIds.length;
        order.orderType =
            vendorIds.length > 1 ? "multi_vendor" : "single_vendor";

        if (vendorIds.length === 1) {
            order.vendor = vendorIds[0];
        } else {
            order.vendor = undefined;
        }
    }

    if (!order.paymentMode) {
        order.paymentMode = "online";
    }

    if (!order.paymentStatus) {
        order.paymentStatus =
            order.paymentMode === "cod" ? "pending" : "success";
    }

    if (!order.status || order.status === "pending") {
        order.status = "placed";
    }
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ vendor: 1, createdAt: -1 });
orderSchema.index({ vendors: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ orderType: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });

export const OrderModel: Model<IOrderDocument> =
    mongoose.model<IOrderDocument>("Order", orderSchema);