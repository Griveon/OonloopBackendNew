import { Document, Types } from "mongoose";

export type VendorOrderStatus =
    | "pending"
    | "placed"
    | "seller_accepted"
    | "picking_products"
    | "packing_order"
    | "ready_for_pickup"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "returned";

export type SellerOrderStatus =
    | "pending_acceptance"
    | "accepted"
    | "picking_products"
    | "packing_order"
    | "ready_for_pickup"
    | "handed_to_rider"
    | "cancelled";

export type DeliveryStatus =
    | "not_assigned"
    | "assigned"
    | "delivery_accepted"
    | "proceeding_to_store"
    | "reached_store"
    | "waiting_for_packing"
    | "pickup_verification_pending"
    | "pickup_verified"
    | "picked_up"
    | "out_for_delivery"
    | "reached_customer"
    | "customer_verification_pending"
    | "delivered"
    | "failed"
    | "returned";

export type PaymentStatus =
    | "pending"
    | "success"
    | "failed"
    | "refunded";

export type PaymentMode =
    | "cod"
    | "online";

export type TrackingUpdatedByRole =
    | "user"
    | "vendor"
    | "driver"
    | "admin"
    | "system";

/**
 * system = registered Oonloop vendor/user
 * custom = outside vendor that does not exist in our system
 */
export type VendorType = "system" | "custom";

/**
 * Snapshot of an outside/custom vendor.
 * We intentionally do not create a fake User/VendorProfile for this vendor.
 */
export interface ICustomVendor {
    externalVendorId?: string;

    name: string;
    phone: string;
    address: string;

    latitude?: number | null;
    longitude?: number | null;

    notes?: string;
}

export interface IOrderVendorItem {
    product: Types.ObjectId;
    variant?: Types.ObjectId | null;

    name: string;
    sku?: string;

    /**
     * Customer/order selling price.
     * This remains unchanged even when sourced from an outside vendor.
     */
    price: number;
    customerSellingPrice?: number;
    mrp?: number;

    /**
     * Actual amount paid to an outside/custom vendor.
     * Keep this separate from customer selling price.
     */
    procurementPrice?: number | null;

    quantity: number;

    images?: {
        url: string;
    }[];

    total: number;
}

export interface IAddressLocation {
    type?: "Point";
    coordinates?: number[];
}

export interface IAddress {
    name?: string;
    phone?: string;

    addressLine1?: string;
    addressLine2?: string;
    landmark?: string;

    city?: string;
    state?: string;

    pincode?: string;
    postalCode?: string;
    country?: string;

    latitude?: number | null;
    longitude?: number | null;
    lat?: number | null;
    lng?: number | null;

    fullAddress?: string;
    location?: IAddressLocation;
}

export interface ITrackingHistory {
    title?: string;
    status: string;
    remark?: string;

    updatedBy?: Types.ObjectId;
    updatedByRole?: TrackingUpdatedByRole;

    updatedAt?: Date;
}

export interface IGeoLocation {
    lat?: number;
    lng?: number;
    address?: string;
    updatedAt?: Date;
}

export interface IPickupVerification {
    pickupOtp?: string;
    pickupQrCode?: string;

    otpVerified?: boolean;
    qrVerified?: boolean;

    verifiedAt?: Date;
    verifiedBy?: Types.ObjectId;
}

export interface ICustomerVerification {
    deliveryOtp?: string;
    otpVerified?: boolean;

    signatureUrl?: string;
    signatureTaken?: boolean;

    verifiedAt?: Date;
    verifiedBy?: Types.ObjectId;
}

export interface IOrderVendor {
    parentOrder: Types.ObjectId;

    user: Types.ObjectId;

    /**
     * Registered system vendor or outside/custom vendor.
     * Optional keeps old creation code backward-compatible because
     * mongoose applies the model default = "system".
     */
    vendorType?: VendorType;

    /**
     * Required for vendorType = "system".
     * Null/undefined for vendorType = "custom".
     */
    vendor?: Types.ObjectId | null;

    /**
     * Present only when vendorType = "custom".
     */
    customVendor?: ICustomVendor;

    driver?: Types.ObjectId;

    orderNumber: string;
    vendorOrderNumber: string;

    items: IOrderVendorItem[];

    billingAddress?: IAddress;
    shippingAddress?: IAddress;

    paymentMethod: Types.ObjectId;
    paymentTransaction?: Types.ObjectId;

    subtotal: number;
    discount?: number;

    gstAmount?: number;
    shippingCharge?: number;

    totalAmount: number;

    paymentStatus: PaymentStatus;
    paymentMode?: PaymentMode;

    status: VendorOrderStatus;

    sellerStatus: SellerOrderStatus;
    deliveryStatus: DeliveryStatus;

    sellerAcceptDeadlineAt?: Date;
    sellerAcceptedAt?: Date;
    pickingStartedAt?: Date;
    packingStartedAt?: Date;
    readyForPickupAt?: Date;
    handedToRiderAt?: Date;

    driverAssignedAt?: Date;
    deliveryAcceptedAt?: Date;
    proceedingToStoreAt?: Date;
    reachedStoreAt?: Date;
    waitingForPackingAt?: Date;
    pickedUpAt?: Date;
    outForDeliveryAt?: Date;
    reachedCustomerAt?: Date;

    shippedAt?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
    returnedAt?: Date;

    pickupVerification?: IPickupVerification;
    customerVerification?: ICustomerVerification;

    isLiveTrackingEnabled?: boolean;
    currentLocation?: IGeoLocation;

    trackingHistory?: ITrackingHistory[];

    cancellationReason?: string;
    failureReason?: string;

    notes?: string;

    isPreorder?: boolean;
    preorder?: Types.ObjectId;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IOrderVendorDocument extends IOrderVendor, Document { }
