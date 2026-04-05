import mongoose, { Schema, Model } from "mongoose";
import type { IVendorCouponDocument } from "../interfaces/vendorcoupon.interface.js";

const VendorCouponSchema: Schema<IVendorCouponDocument> =
    new Schema(
        {
            vendorId: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true,
            },

            couponType: {
                type: String,
                enum: ["PRODUCT"],
                default: "PRODUCT",
                immutable: true,
            },

            discountType: {
                type: String,
                enum: ["PERCENTAGE", "FIXED"],
                required: true,
            },

            discountValue: {
                type: Number,
                required: true,
                min: 0,
            },

            minOrderValue: {
                type: Number,
                default: null,
            },

            couponCode: {
                type: String,
                required: true,
                uppercase: true,
                trim: true,
            },

            description: {
                type: String,
                default: "",
                trim: true,
            },

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },
        },
        { timestamps: true }
    );

VendorCouponSchema.index(
    { vendorId: 1, couponCode: 1 },
    { unique: true }
);

export const VendorCouponModel: Model<IVendorCouponDocument> =
    mongoose.model<IVendorCouponDocument>(
        "VendorCoupon",
        VendorCouponSchema
    );