import { Document, Types } from "mongoose";

export interface IVendorSubscriptionFeature {
    feature: Types.ObjectId;
    value: number | boolean;
}

export interface IVendorSubscription {
    user: Types.ObjectId;
    plan: Types.ObjectId;

    status: "active" | "cancelled" | "expired" | "pending";

    startDate: Date;
    endDate: Date;

    billingCycle: "monthly" | "yearly";

    autoRenew: boolean;

    features: IVendorSubscriptionFeature[];

    paymentTransactionId?: Types.ObjectId;
    externalPaymentId?: string;

    isActive: boolean;

    cancelledAt?: Date;
    expiredAt?: Date;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IVendorSubscriptionDocument
    extends IVendorSubscription,
    Document { }