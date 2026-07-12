import { Document, Types } from "mongoose";

// What the rider tags the photo as (drives the customer's action buttons)
export type PhotoType =
    | "info"        // just sharing — no action
    | "approval"    // customer approves/rejects (e.g. confirm an item)
    | "payment";    // customer pays/denies (e.g. a bill QR)

export type PhotoStatus =
    | "none"        // info photo — nothing to do
    | "pending"     // awaiting the customer
    | "approved"    // approval accepted
    | "rejected"    // approval rejected
    | "paid"        // payment done
    | "denied";     // payment denied

export interface IShopperPhoto {
    booking: Types.ObjectId;       // FK -> PersonalShopperBooking
    rider: Types.ObjectId;         // who sent it (the assigned driver/User)

    imageUrl: string;
    caption?: string;

    // optional link to a specific store in the booking
    storeId?: Types.ObjectId;
    storeName?: string;

    type: PhotoType;
    status: PhotoStatus;
    customerRemark?: string;
    respondedAt?: Date;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IShopperPhotoDocument extends IShopperPhoto, Document { }
