import type { Document, Types } from "mongoose";
import type {
    PreorderFulfillmentMode,
    PreorderOrderStatus,
    PreorderPaymentStatus,
} from "../constants/preorder.constants.js";

export interface IGeoPoint {
    lat: number;
    lng: number;
}

// ---------------- Seller config ----------------

export interface IPreorderSlot {
    label: string; // e.g. "Evening"
    start: string; // "HH:mm"
    end: string; // "HH:mm"
}

export interface IPreorderSameDayConfig {
    enabled: boolean;
    readyWithinHours: number; // approx prep time from order -> ready
    cutoffTime: string; // "HH:mm" last order time for same-day; "" = no cutoff
}

export interface IPreorderScheduledConfig {
    enabled: boolean;
    minLeadDays: number; // earliest = today + minLeadDays
    horizonDays: number; // latest  = today + horizonDays
    slots: IPreorderSlot[];
}

export interface IPreorderConfig {
    product: Types.ObjectId;
    vendor: Types.ObjectId;
    isActive: boolean;
    sameDay: IPreorderSameDayConfig;
    scheduled: IPreorderScheduledConfig;
}

export interface IPreorderConfigDocument extends IPreorderConfig, Document {
    createdAt: Date;
    updatedAt: Date;
}

// ---------------- Customer order ----------------

export interface IPreorderOrderItem {
    product: Types.ObjectId;
    name: string;
    image: string;
    variantId?: Types.ObjectId;
    variantLabel?: string;
    price: number;
    qty: number;
    total: number;
}

export interface IPreorderDelivery {
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

export interface IPreorderTrackingEntry {
    title: string;
    status: string;
    remark: string;
    updatedByRole: string;
    updatedAt: Date;
}

export interface IPreorderOrder {
    user: Types.ObjectId;
    vendor: Types.ObjectId;
    orderNumber: string;

    items: IPreorderOrderItem[];

    subtotal: number;
    platformFee: number;
    feeGst: number;
    deliveryFee: number; // display only
    totalAmount: number;

    fulfillmentMode: PreorderFulfillmentMode;

    sameDay?: {
        readyWithinHours: number;
        promisedReadyAt: Date;
    };

    scheduled?: {
        date: Date;
        slotLabel: string;
        slotStart: string;
        slotEnd: string;
    };

    delivery: IPreorderDelivery;

    status: PreorderOrderStatus;
    paymentStatus: PreorderPaymentStatus;
    paymentTransaction?: Types.ObjectId;

    // Rider (User with role "driver") — reuses the delivery pipeline.
    driver?: Types.ObjectId;
    driverAssignedAt?: Date;

    trackingHistory: IPreorderTrackingEntry[];

    placedAt?: Date;
    readyAt?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;

    isActive: boolean;
}

export interface IPreorderOrderDocument extends IPreorderOrder, Document {
    createdAt: Date;
    updatedAt: Date;
}
