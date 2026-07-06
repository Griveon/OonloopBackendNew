import { Document, Types } from "mongoose";

/**
 * Parent/customer order status.
 * This status represents the overall order from customer point of view.
 */
export type OrderStatus =
    | "pending"
    | "placed"
    | "processing"
    | "partially_ready"
    | "ready_for_pickup"
    | "partially_shipped"
    | "shipped"
    | "partially_delivered"
    | "delivered"
    | "partially_cancelled"
    | "cancelled"
    | "returned";

export type PaymentStatus =
    | "pending"
    | "success"
    | "failed"
    | "refunded";

export type PaymentMode =
    | "cod"
    | "online";

export type OrderType =
    | "single_vendor"
    | "multi_vendor";

export type TrackingUpdatedByRole =
    | "user"
    | "vendor"
    | "driver"
    | "admin"
    | "system";

export interface IOrderItem {
    vendor: Types.ObjectId;

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

export interface ITrackingHistory {
    title?: string;
    status: string;
    remark?: string;

    updatedBy?: Types.ObjectId;
    updatedByRole?: TrackingUpdatedByRole;

    updatedAt?: Date;
}

export interface IOrder {
    /**
     * Customer who placed the order
     */
    user: Types.ObjectId;

    /**
     * Kept only for backward compatibility.
     * For new multi-vendor orders, use vendors[].
     * For single-vendor order, this can contain that seller id.
     */
    vendor?: Types.ObjectId;

    /**
     * All vendors involved in this parent order.
     */
    vendors?: Types.ObjectId[];

    orderType?: OrderType;

    vendorOrderCount?: number;

    orderNumber: string;

    /**
     * Parent order can still store all items for customer order detail.
     * Every item must contain vendor id.
     */
    items: IOrderItem[];

    billingAddress?: IAddress;
    shippingAddress?: IAddress;

    paymentMethod: Types.ObjectId;
    paymentTransaction?: Types.ObjectId;

    subtotal: number;
    discount?: number;

    gstRuleId?: Types.ObjectId;
    gstAmount?: number;

    shippingCharge?: number;
    totalAmount: number;

    paymentStatus: PaymentStatus;
    paymentMode?: PaymentMode;

    /**
     * Overall customer-facing order status.
     * Seller/driver status will be handled in OrderVendorModel.
     */
    status: OrderStatus;

    /**
     * Basic tracking for parent/customer order.
     * Detailed seller/driver tracking will be in OrderVendorModel.
     */
    trackingHistory?: ITrackingHistory[];

    cancellationReason?: string;
    failureReason?: string;

    notes?: string;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IOrderDocument extends IOrder, Document { }