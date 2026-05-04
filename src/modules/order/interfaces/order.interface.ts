import { Document, Types } from "mongoose";

export type OrderStatus =
    | "pending"
    | "placed"
    | "confirmed"
    | "packed"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "returned";

export type PaymentStatus =
    | "pending"
    | "success"
    | "failed"
    | "refunded";

export interface IOrderItem {
    product: Types.ObjectId;
    variant?: Types.ObjectId;

    name: string;
    sku?: string;

    price: number;
    mrp?: number;

    quantity: number;

    images?: {
        url: string;
    }[];

    total: number;
}

export interface IAddress {
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
}

export interface IOrder {
    user: Types.ObjectId;
    vendor: Types.ObjectId;
    orderNumber: string;
    
    items: IOrderItem[];

    billingAddress?: IAddress;
    shippingAddress?: IAddress;

    paymentMethod: Types.ObjectId;
    paymentTransaction?: Types.ObjectId;

    subtotal: number;
    discount?: number;
    gstAmount?: number;
    gstRuleId?: Types.ObjectId;
    shippingCharge?: number;
    totalAmount: number;
    paymentStatus: PaymentStatus;
    paymentMode?: "cod" | "online";
    
    status: OrderStatus;

    tracking?: string;
    courierName?: string;

    shippedAt?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;

    notes?: string;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IOrderDocument extends IOrder, Document { }