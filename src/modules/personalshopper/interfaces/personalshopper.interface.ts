import { Document, Types } from "mongoose";

export type ShoppingAssistance =
    | "call"
    | "video_call"
    | "instructions_only";

export type BookingStatus =
    | "pending"
    | "confirmed"
    | "shopping"
    | "finding_rider"
    | "rider_assigned"
    | "heading_to_store"        // rider going to / between the shops
    | "returning_to_customer"   // shopping done, heading back to deliver
    | "delivered"
    | "cancelled";

export type BookingPaymentStatus =
    | "pending"
    | "paid"
    | "refunded"
    | "failed";

export interface IGeoPoint {
    lat: number;
    lng: number;
}

export interface IShopperStore {
    sequence: number;              // display order 1..5
    storeName?: string;            // optional, "if you know it"
    location: IGeoPoint;           // pinned on map
    itemsToBuy: string;            // "what do you want to buy"
    image?: string;                // optional reference image url
    distanceFromPrevKm?: number;   // computed leg distance
}

export interface IDeliveryDetails {
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

export interface IEstimate {
    travelMinutes: number;
    shoppingMinutes: number;
    totalMinutes: number;
    totalDistanceKm: number;
    shopperFee: number;
    breakdown: string;             // e.g. "First 1 hour: ₹250 + Additional 30 mins: ₹100"
}

export interface IAdditionalCharges {
    transportation?: number;
    travel?: number;
    notes?: string;
}

export interface IPersonalShopperBooking {
    user: Types.ObjectId;
    bookingNumber: string;

    stores: IShopperStore[];
    delivery: IDeliveryDetails;
    shoppingAssistance: ShoppingAssistance;

    estimate: IEstimate;

    // filled during/after the shop
    actualShopperFee?: number;
    productCost?: number;
    additionalCharges?: IAdditionalCharges;

    // Assigned rider (a User with role "driver"). Same person shops + delivers.
    driver?: Types.ObjectId;
    driverAssignedAt?: Date;

    // Delivery tracking
    findingRiderSince?: Date;      // when we started looking for a rider
    riderStartLocation?: IGeoPoint; // rider position when assigned (interp start)
    deliveryStartedAt?: Date;       // when movement began (interp clock)

    // Real coordinates pushed by the rider app (prod). When present, these are
    // used instead of the simulated position.
    riderLiveLocation?: IGeoPoint;
    riderLocationUpdatedAt?: Date;

    status: BookingStatus;
    paymentStatus: BookingPaymentStatus;
    paymentTransaction?: Types.ObjectId;

    deliveredAt?: Date;
    cancelledAt?: Date;

    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPersonalShopperBookingDocument
    extends IPersonalShopperBooking,
    Document { }
