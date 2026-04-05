import { Document, Types } from "mongoose";

export type DiscountType = "PERCENTAGE" | "FIXED";

export interface IVendorCoupon {
    vendorId: Types.ObjectId;

    couponType: "PRODUCT";

    discountType: DiscountType;
    discountValue: number;

    minOrderValue?: number;

    couponCode: string;

    description?: string;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IVendorCouponDocument
    extends IVendorCoupon,
    Document { }