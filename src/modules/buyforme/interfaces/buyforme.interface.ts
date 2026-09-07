import { Document, Types } from "mongoose";

export type BuyForMeStatus =
    | "draft"
    | "submitted"
    | "confirmed"          // paid
    | "finding_shopper"
    | "shopper_assigned"
    | "shopping"
    | "ready"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";

export type BuyForMePaymentStatus =
    | "pending"
    | "paid"
    | "partially_refunded"
    | "refunded";

export interface IGeoPoint {
    lat: number;
    lng: number;
}

export interface IBuyForMeDelivery {
    fullName?: string;
    mobileNumber: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    location: IGeoPoint;
}

export interface IBuyForMeRequest {
    user: Types.ObjectId;
    requestNumber: string;

    sourceMode: "no_preference" | "oonloop_store" | "named_store";
    preferredStore?: { storeId?: Types.ObjectId; storeName?: string };
    radiusKm: number;

    delivery?: IBuyForMeDelivery;

    // pricing
    budget?: number;              // shopping budget (escrow, max)
    serviceFee: number;
    gstPercent: number;
    gstAmount: number;
    totalPayable: number;         // budget + serviceFee + gstAmount

    // after shopping
    actualBillAmount?: number;
    refundAmount?: number;

    status: BuyForMeStatus;
    paymentStatus: BuyForMePaymentStatus;
    paymentTransaction?: Types.ObjectId;

    shopper?: Types.ObjectId;

    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IBuyForMeRequestDocument extends IBuyForMeRequest, Document { }
