import { Document, Types } from "mongoose";

export type DriverStatus =
    | "pending"
    | "approved"
    | "rejected"
    | "suspended";

export interface IKycDocument {
    fileUrl: string;
    status: "pending" | "approved" | "rejected";
    adminRemark?: string;
    updatedAt?: Date;
}

export interface IDriverProfile {
    user: Types.ObjectId;

    profileImage?: string;

    drivingLicenseNumber: string;
    drivingLicenseExpiry?: Date;

    aadhaarNumber?: string;
    panNumber?: string;

    vehicleType:
    | "bike"
    | "car"
    | "auto"
    | "truck"
    | "van";

    vehicleNumber: string;
    vehicleModel?: string;
    vehicleBrand?: string;
    vehicleYear?: number;

    bankDetails?: {
        accountHolder?: string;
        bankName?: string;
        accountNumber?: string;
        ifsc?: string;
    };

    currentLocation?: {
        type: "Point";
        coordinates: [number, number];
    };

    kycDocuments?: {
        aadhaarCard?: IKycDocument;
        panCard?: IKycDocument;
        drivingLicense?: IKycDocument;
        rcBook?: IKycDocument;
        insurance?: IKycDocument;
        vehiclePermit?: IKycDocument;
        pollutionCertificate?: IKycDocument;
        profilePhoto?: IKycDocument;
    };

    isKycSubmitted: boolean;
    isKycApproved: boolean;

    profileStatus: DriverStatus;

    isVerified: boolean;

    isOnline?: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IDriverDocument
    extends IDriverProfile,
    Document { }