import { Document, Types } from "mongoose";

export type PaymentStatus =
    | "pending"
    | "success"
    | "failed"
    | "cancelled";

export interface IPaymentTransaction {

    
    paymentMethod: Types.ObjectId;
    providerConnection: Types.ObjectId;

    amount: number;
    currency: string;

    status: PaymentStatus;

    externalPaymentId?: string;
    externalOrderId?: string;

    metadata?: Record<string, any>;

    paidAt?: Date;
    failedAt?: Date;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPaymentTransactionDocument
    extends IPaymentTransaction,
    Document { }