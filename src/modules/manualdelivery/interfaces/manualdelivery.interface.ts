import type { Document, Types } from "mongoose";
import type {
    ManualDeliveryStatus,
    ManualDeliverySource,
    DistanceCalculationMethod,
    ManualDeliveryAssignmentAction,
} from "../constants/manualdelivery.constants.js";

export interface IGeoPointLocation {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
}

export interface IManualDeliveryPickup {
    vendorId: Types.ObjectId;
    vendorProfileId?: Types.ObjectId;
    storeName: string;
    contactName?: string;
    contactPhone?: string;
    addressLine1: string;
    addressLine2?: string;
    area?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
    location?: IGeoPointLocation;
    formattedAddress?: string;
}

export interface IManualDeliveryCustomer {
    name: string;
    mobileNumber: string;
    countryCode: string;
    customerId?: Types.ObjectId | null;
}

export interface IManualDeliveryDropoff {
    addressLine1: string;
    addressLine2?: string;
    area?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
    location?: IGeoPointLocation;
    formattedAddress?: string;
    mapLink?: string | null;
}

export interface IManualDeliveryDistance {
    valueKm: number | null;
    valueMeters: number | null;
    calculationMethod: DistanceCalculationMethod | null;
    provider: string | null;
    calculatedAt: Date | null;
}

export interface IDriverSnapshot {
    driverId: Types.ObjectId;
    name: string;
    phone: string;
    vehicleType?: string;
    vehicleNumber?: string;
}

export interface IStatusHistoryEntry {
    status: ManualDeliveryStatus;
    title: string;
    remark?: string;
    updatedBy?: Types.ObjectId;
    updatedByRole: "vendor" | "driver" | "admin" | "system";
    updatedAt: Date;
}

export interface IAssignmentHistoryEntry {
    driver: Types.ObjectId;
    driverName?: string;
    action: ManualDeliveryAssignmentAction;
    assignedAt: Date;
    respondedAt?: Date;
    reason?: string;
}

export interface IManualDelivery {
    deliveryNumber: string;
    vendor: Types.ObjectId; // User._id for the vendor
    vendorProfile: Types.ObjectId; // VendorProfile._id
    createdBy: Types.ObjectId; // User._id who initiated creation
    source: ManualDeliverySource;
    status: ManualDeliveryStatus;

    pickup: IManualDeliveryPickup;
    customer: IManualDeliveryCustomer;
    dropoff: IManualDeliveryDropoff;

    customerNotes?: string | undefined;

    distance: IManualDeliveryDistance;

    // Driver assignment
    driver?: Types.ObjectId | null | undefined;
    driverUser?: Types.ObjectId | null | undefined;
    driverSnapshot?: IDriverSnapshot | null | undefined;

    // Milestones / timestamps
    assignedAt?: Date | null | undefined;
    acceptedAt?: Date | null | undefined;
    pickedUpAt?: Date | null | undefined;
    outForDeliveryAt?: Date | null | undefined;
    reachedAt?: Date | null | undefined;
    deliveredAt?: Date | null | undefined;
    cancelledAt?: Date | null | undefined;
    failedAt?: Date | null | undefined;

    // Reasons
    cancellationReason?: string | null | undefined;
    failureReason?: string | null | undefined;
    rejectionReason?: string | null | undefined;

    // Histories
    statusHistory: IStatusHistoryEntry[];
    assignmentHistory: IAssignmentHistoryEntry[];

    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IManualDeliveryDocument extends IManualDelivery, Document {}

export interface IManualDeliveryFilter {
    vendor?: Types.ObjectId | string;
    driver?: Types.ObjectId | string;
    status?: ManualDeliveryStatus | { $in: ManualDeliveryStatus[] };
    search?: string;
    customerMobile?: string;
    startDate?: Date;
    endDate?: Date;
    deliveryNumber?: string;
}

export interface IPaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
