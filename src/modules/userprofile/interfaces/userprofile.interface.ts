import { Document, Types } from "mongoose";

export interface IImage {
    url: string;
    name?: string;
    alt?: string;
    isPrimary?: boolean;
}

export type AddressLabel = "home" | "work" | "other";

export interface IAddress {
    label?: AddressLabel;
    fullName?: string;
    mobileNumber?: string;

    addressLine1: string;
    addressLine2?: string;

    city: string;
    state: string;
    country: string;
    postalCode: string;

    // ✅ REQUIRED LAT LNG
    location: {
        lat: number;
        lng: number;
    };

    isDefault?: boolean;
}

export interface IUserProfile {
    user: Types.ObjectId;

    bio?: string;

    profileImage?: IImage;
    coverImage?: IImage;

    gallery?: IImage[];

    addresses?: IAddress[];

    companyName?: string;
    vehicleDetails?: string;

    socialLinks?: {
        linkedin?: string;
        twitter?: string;
        instagram?: string;
        website?: string;
    };

    preferences?: {
        language?: string;
        notificationsEnabled?: boolean;
    };

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUserProfileDocument extends IUserProfile, Document { }