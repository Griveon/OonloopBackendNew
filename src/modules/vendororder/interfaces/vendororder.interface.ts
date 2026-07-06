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

export interface IOrderVendorItem {
    product: Types.ObjectId;
    variant?: Types.ObjectId | null;

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
    vendor: Types.ObjectId;
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

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IOrderVendorDocument extends IOrderVendor, Document { }