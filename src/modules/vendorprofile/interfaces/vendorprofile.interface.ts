import { Document, Types } from "mongoose";

export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";

export interface IImage {
    url: string;
    name?: string;
    alt?: string;
    isPrimary?: boolean;
    position?: number;
}

export interface ILocation {
    type: "Point";
    coordinates: [number, number];
}

export interface IStoreAddress {
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;

    city: string;
    state: string;
    country?: string;
    postalCode: string;

    latitude?: number;
    longitude?: number;

    location?: ILocation;
}

export interface IKycDocument {
    fileUrl: string;
    status: "pending" | "approved" | "rejected";
    adminRemark?: string;
    updatedAt?: Date;
}

export interface IVendorProfile {

    // 🔗 LINKED USER
    user: Types.ObjectId;

    // 🏢 BUSINESS INFO
    businessType:
    | "individual"
    | "proprietorship"
    | "partnership"
    | "private_limited"
    | "llp"
    | "public_limited";

    storeName: string;
    storeSlug: string;

    storeLogo?: string;
    storeImages?: IImage[];

    storeLocationAddress: IStoreAddress;

    gstNumber?: string;
    panNumber?: string;

    workingHours?: {
        openingTime?: string;
        closingTime?: string;
    };

    workingDays?: string[];

    bankDetails?: {
        accountHolder?: string;
        bankName?: string;
        accountNumber?: string;
        ifsc?: string;
    };

    // 📄 KYC
    kycDocuments?: {
        gstCertificate?: IKycDocument;
        panCard?: IKycDocument;
        cancelledCheque?: IKycDocument;
        storeRegistration?: IKycDocument;
        aadhaarCard?: IKycDocument;
        tradeLicense?: IKycDocument;
        udyamAadhaar?: IKycDocument;
        shopActLicense?: IKycDocument;
        certificateOfIncorporation?: IKycDocument;
        other?: IKycDocument;
    };

    isKycSubmitted: boolean;
    isKycApproved: boolean;

    profileStatus: VendorStatus;
    isVerified: boolean;

    createdAt?: Date;
    updatedAt?: Date;

    isOnHoliday?: boolean;

    holidayMessage?: string;

    holidayStartDate?: Date;

    holidayEndDate?: Date;
}

export interface IVendorDocument extends IVendorProfile, Document { }