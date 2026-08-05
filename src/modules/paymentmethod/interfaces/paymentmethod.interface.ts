import mongoose, { Schema, Model, Document } from "mongoose";

export type PaymentMethodType = "cod" | "online";

export interface IPaymentMethod {

    name: string;

    type: PaymentMethodType;

    providerConnectionId?: mongoose.Types.ObjectId;

    isActive: boolean;

    // DEV-ONLY: when true, payments using this method succeed instantly
    // without a real gateway (gated by ALLOW_DEMO_PAYMENT env).
    isDemo?: boolean;

    priority: number;

    charges?: {
        type: "percentage" | "flat";
        value: number;
    };

    rules?: {
        minAmount?: number;
        maxAmount?: number;
        allowedPincodes?: string[];
        blockedPincodes?: string[];
    };

    meta?: Record<string, any>;

    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;

    isDeleted?: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPaymentMethodDocument
    extends IPaymentMethod,
    Document { }
