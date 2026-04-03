import { Document } from "mongoose";

export type ProviderType =
    | "razorpay"
    | "stripe"
    | "paypal"
    | "cashfree"
    | "payu"
    | "twilio"
    | "smtp"
    | "shiprocket"
    | "delhivery";

export type ProviderCategory =
    | "payment"
    | "shipping"
    | "sms"
    | "email";

export type EnvironmentType = "test" | "live";

export interface IEncryptedValue {
    value: string;
    iv: string;
}

export interface IProviderConnection {
    provider: ProviderType;
    category: ProviderCategory;

    name: string;

    isActive: boolean;
    environment: EnvironmentType;

    priority: number;

    credentials: Map<string, IEncryptedValue>;

    webhook?: {
        url?: string;
        secret?: IEncryptedValue;
    };

    lastUsedAt?: Date;

    createdBy?: string;
    updatedBy?: string;
    isDeleted?: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IProviderConnectionMethods {
    encryptValue(plainText: string): IEncryptedValue;
    decryptValue(data: IEncryptedValue): string;
}

// ✅ 🔥 FIX IS HERE
export interface IProviderConnectionDocument
    extends IProviderConnection,
    Document,
    IProviderConnectionMethods { }