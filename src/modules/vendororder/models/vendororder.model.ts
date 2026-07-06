import mongoose, { Schema, Model } from "mongoose";
import type { IOrderVendorDocument } from "../interfaces/vendororder.interface.js";

const orderVendorItemSchema = new Schema(
    {
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

const geoLocationSchema = new Schema(
    {
        lat: {
            type: Number,
        },

        lng: {
            type: Number,
        },

        address: {
            type: String,
            trim: true,
        },

        updatedAt: {
            type: Date,
        },
    },
    { _id: false }
);
const pickupVerificationSchema = new Schema(
    {
        pickupOtp: {
            type: String,
            select: false,
        },

        pickupQrCode: {
            type: String,
            select: false,
        },

        otpVerified: {
            type: Boolean,
            default: false,
        },

        qrVerified: {
            type: Boolean,
            default: false,
        },

        verifiedAt: {
            type: Date,
        },

        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "DriverProfile",
        },
    },
    { _id: false }
);

const customerVerificationSchema = new Schema(
    {
        deliveryOtp: {
            type: String,
            select: false,
        },

        otpVerified: {
            type: Boolean,
            default: false,
        },

        signatureUrl: {
            type: String,
            trim: true,
        },

        signatureTaken: {
            type: Boolean,
            default: false,
        },

        verifiedAt: {
            type: Date,
        },

        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "DriverProfile",
        },
    },
    { _id: false }
);

const orderVendorSchema = new Schema<IOrderVendorDocument>(
    {
        parentOrder: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true,
        },

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

        driver: {
            type: Schema.Types.ObjectId,
            ref: "DriverProfile",
            index: true,
        },

        orderNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        vendorOrderNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        items: {
            type: [orderVendorItemSchema],
            required: true,
            validate: {
                validator: function (items: any[]) {
                    return Array.isArray(items) && items.length > 0;
                },
                message: "Vendor order must contain at least one item",
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

        status: {
            type: String,
            enum: [
                "pending",
                "placed",
                "seller_accepted",
                "picking_products",
                "packing_order",
                "ready_for_pickup",
                "shipped",
                "delivered",
                "cancelled",
                "returned",
            ],
            default: "placed",
            index: true,
        },

        paymentMode: {
            type: String,
            enum: ["cod", "online"],
        },

        sellerStatus: {
            type: String,
            enum: [
                "pending_acceptance",
                "accepted",
                "picking_products",
                "packing_order",
                "ready_for_pickup",
                "handed_to_rider",
                "cancelled",
            ],
            default: "pending_acceptance",
            index: true,
        },

        deliveryStatus: {
            type: String,
            enum: [
                "not_assigned",
                "assigned",
                "delivery_accepted",
                "proceeding_to_store",
                "reached_store",
                "waiting_for_packing",
                "pickup_verification_pending",
                "pickup_verified",
                "picked_up",
                "out_for_delivery",
                "reached_customer",
                "customer_verification_pending",
                "delivered",
                "failed",
                "returned",
            ],
            default: "not_assigned",
            index: true,
        },

        sellerAcceptDeadlineAt: {
            type: Date,
        },

        sellerAcceptedAt: Date,
        pickingStartedAt: Date,
        packingStartedAt: Date,
        readyForPickupAt: Date,
        handedToRiderAt: Date,

        driverAssignedAt: Date,
        deliveryAcceptedAt: Date,
        proceedingToStoreAt: Date,
        reachedStoreAt: Date,
        waitingForPackingAt: Date,
        pickedUpAt: Date,
        outForDeliveryAt: Date,
        reachedCustomerAt: Date,

        shippedAt: Date,
        deliveredAt: Date,
        cancelledAt: Date,
        returnedAt: Date,

        pickupVerification: {
            type: pickupVerificationSchema,
            default: {},
        },

        customerVerification: {
            type: customerVerificationSchema,
            default: {},
        },

        isLiveTrackingEnabled: {
            type: Boolean,
            default: false,
        },

        currentLocation: {
            type: geoLocationSchema,
            default: undefined,
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

orderVendorSchema.virtual("totalItems").get(function () {
    const order: any = this;

    if (!Array.isArray(order.items)) {
        return 0;
    }

    return order.items.reduce((sum: number, item: any) => {
        return sum + Number(item?.quantity || 0);
    }, 0);
});

orderVendorSchema.pre("validate", function () {
    const order: any = this;

    if (order.isNew && !order.sellerAcceptDeadlineAt) {
        order.sellerAcceptDeadlineAt = new Date(Date.now() + 5 * 60 * 1000);
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

orderVendorSchema.index({ parentOrder: 1, createdAt: -1 });
orderVendorSchema.index({ user: 1, createdAt: -1 });
orderVendorSchema.index({ vendor: 1, createdAt: -1 });
orderVendorSchema.index({ vendor: 1, sellerStatus: 1, createdAt: -1 });
orderVendorSchema.index({ vendor: 1, status: 1, createdAt: -1 });
orderVendorSchema.index({ driver: 1, deliveryStatus: 1, createdAt: -1 });
orderVendorSchema.index({ deliveryStatus: 1, createdAt: -1 });
orderVendorSchema.index({ vendorOrderNumber: 1 }, { unique: true });

export const OrderVendorModel: Model<IOrderVendorDocument> =
    mongoose.model<IOrderVendorDocument>("OrderVendor", orderVendorSchema);