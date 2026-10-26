import mongoose, { Schema, Model } from "mongoose";
import type {
    IManualDeliveryDocument,
} from "../interfaces/manualdelivery.interface.js";
import {
    MANUAL_DELIVERY_STATUS,
    MANUAL_DELIVERY_SOURCE,
    DISTANCE_CALCULATION_METHOD,
    MANUAL_DELIVERY_ASSIGNMENT_ACTION,
} from "../constants/manualdelivery.constants.js";

const geoPointLocationSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: undefined,
            validate: {
                validator: function (value: number[]) {
                    if (!value) return true;
                    return (
                        Array.isArray(value) &&
                        value.length === 2 &&
                        typeof value[0] === "number" &&
                        typeof value[1] === "number"
                    );
                },
                message: "Location coordinates must be [longitude, latitude]",
            },
        },
    },
    { _id: false }
);

const pickupAddressSchema = new Schema(
    {
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        vendorProfileId: {
            type: Schema.Types.ObjectId,
            ref: "VendorProfile",
        },
        storeName: {
            type: String,
            required: true,
            trim: true,
        },
        contactName: {
            type: String,
            trim: true,
        },
        contactPhone: {
            type: String,
            trim: true,
        },
        addressLine1: {
            type: String,
            required: true,
            trim: true,
        },
        addressLine2: {
            type: String,
            trim: true,
        },
        area: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        state: {
            type: String,
            required: true,
            trim: true,
        },
        postalCode: {
            type: String,
            required: true,
            trim: true,
        },
        country: {
            type: String,
            default: "India",
            trim: true,
        },
        landmark: {
            type: String,
            trim: true,
        },
        latitude: {
            type: Number,
            default: null,
        },
        longitude: {
            type: Number,
            default: null,
        },
        location: {
            type: geoPointLocationSchema,
            default: undefined,
        },
        formattedAddress: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const customerInfoSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        mobileNumber: {
            type: String,
            required: true,
            trim: true,
        },
        countryCode: {
            type: String,
            default: "+91",
            trim: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { _id: false }
);

const dropoffAddressSchema = new Schema(
    {
        addressLine1: {
            type: String,
            required: true,
            trim: true,
        },
        addressLine2: {
            type: String,
            trim: true,
        },
        area: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            trim: true,
        },
        state: {
            type: String,
            trim: true,
        },
        postalCode: {
            type: String,
            trim: true,
        },
        country: {
            type: String,
            default: "India",
            trim: true,
        },
        landmark: {
            type: String,
            trim: true,
        },
        latitude: {
            type: Number,
            default: null,
        },
        longitude: {
            type: Number,
            default: null,
        },
        location: {
            type: geoPointLocationSchema,
            default: undefined,
        },
        formattedAddress: {
            type: String,
            trim: true,
        },
        mapLink: {
            type: String,
            trim: true,
            default: null,
        },
    },
    { _id: false }
);

const distanceSchema = new Schema(
    {
        valueKm: {
            type: Number,
            default: null,
        },
        valueMeters: {
            type: Number,
            default: null,
        },
        calculationMethod: {
            type: String,
            enum: [...Object.values(DISTANCE_CALCULATION_METHOD), null],
            default: null,
        },
        provider: {
            type: String,
            default: null,
        },
        calculatedAt: {
            type: Date,
            default: null,
        },
    },
    { _id: false }
);

const driverSnapshotSchema = new Schema(
    {
        driverId: {
            type: Schema.Types.ObjectId,
            ref: "DriverProfile",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        vehicleType: {
            type: String,
            trim: true,
        },
        vehicleNumber: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const statusHistorySchema = new Schema(
    {
        status: {
            type: String,
            enum: Object.values(MANUAL_DELIVERY_STATUS),
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        remark: {
            type: String,
            trim: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        updatedByRole: {
            type: String,
            enum: ["vendor", "driver", "admin", "system"],
            default: "system",
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const assignmentHistorySchema = new Schema(
    {
        driver: {
            type: Schema.Types.ObjectId,
            ref: "DriverProfile",
            required: true,
        },
        driverName: {
            type: String,
            trim: true,
        },
        action: {
            type: String,
            enum: Object.values(MANUAL_DELIVERY_ASSIGNMENT_ACTION),
            required: true,
        },
        assignedAt: {
            type: Date,
            default: Date.now,
        },
        respondedAt: {
            type: Date,
        },
        reason: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const ManualDeliverySchema: Schema<IManualDeliveryDocument> =
    new Schema(
        {
            deliveryNumber: {
                type: String,
                required: true,
                unique: true,
                trim: true,
                index: true,
            },

            vendor: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true,
            },

            vendorProfile: {
                type: Schema.Types.ObjectId,
                ref: "VendorProfile",
                required: true,
                index: true,
            },

            createdBy: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },

            source: {
                type: String,
                enum: Object.values(MANUAL_DELIVERY_SOURCE),
                default: MANUAL_DELIVERY_SOURCE.PHONE_CALL,
            },

            status: {
                type: String,
                enum: Object.values(MANUAL_DELIVERY_STATUS),
                default: MANUAL_DELIVERY_STATUS.CREATED,
                index: true,
            },

            pickup: {
                type: pickupAddressSchema,
                required: true,
            },

            customer: {
                type: customerInfoSchema,
                required: true,
            },

            dropoff: {
                type: dropoffAddressSchema,
                required: true,
            },

            customerNotes: {
                type: String,
                maxlength: 1000,
                trim: true,
            },

            distance: {
                type: distanceSchema,
                default: () => ({
                    valueKm: null,
                    valueMeters: null,
                    calculationMethod: null,
                    provider: null,
                    calculatedAt: null,
                }),
            },

            driver: {
                type: Schema.Types.ObjectId,
                ref: "DriverProfile",
                default: null,
                index: true,
            },

            driverUser: {
                type: Schema.Types.ObjectId,
                ref: "User",
                default: null,
                index: true,
            },

            driverSnapshot: {
                type: driverSnapshotSchema,
                default: null,
            },

            assignedAt: {
                type: Date,
                default: null,
            },

            acceptedAt: {
                type: Date,
                default: null,
            },

            pickedUpAt: {
                type: Date,
                default: null,
            },

            outForDeliveryAt: {
                type: Date,
                default: null,
            },

            reachedAt: {
                type: Date,
                default: null,
            },

            deliveredAt: {
                type: Date,
                default: null,
            },

            cancelledAt: {
                type: Date,
                default: null,
            },

            failedAt: {
                type: Date,
                default: null,
            },

            cancellationReason: {
                type: String,
                trim: true,
            },

            failureReason: {
                type: String,
                trim: true,
            },

            rejectionReason: {
                type: String,
                trim: true,
            },

            statusHistory: {
                type: [statusHistorySchema],
                default: [],
            },

            assignmentHistory: {
                type: [assignmentHistorySchema],
                default: [],
            },

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },
        },
        {
            timestamps: true,
        }
    );

// Compound and geospatial indexes
ManualDeliverySchema.index({ vendor: 1, createdAt: -1 });
ManualDeliverySchema.index({ vendor: 1, status: 1, createdAt: -1 });
ManualDeliverySchema.index({ driver: 1, status: 1, createdAt: -1 });
ManualDeliverySchema.index({ "customer.mobileNumber": 1, vendor: 1 });
ManualDeliverySchema.index({ status: 1, createdAt: -1 });
ManualDeliverySchema.index(
    { "pickup.location": "2dsphere" },
    { sparse: true }
);
ManualDeliverySchema.index(
    { "dropoff.location": "2dsphere" },
    { sparse: true }
);

export const ManualDeliveryModel: Model<IManualDeliveryDocument> =
    mongoose.model<IManualDeliveryDocument>(
        "ManualDelivery",
        ManualDeliverySchema
    );

/**
 * Concurrency-safe counter for sequential manual delivery numbers.
 */
interface IManualDeliveryCounter {
    _id: string; // e.g. "MDEL-20261021"
    seq: number;
}

const manualDeliveryCounterSchema = new Schema<IManualDeliveryCounter>(
    {
        _id: { type: String, required: true },
        seq: { type: Number, default: 0 },
    },
    { _id: false, timestamps: true }
);

export const ManualDeliveryCounterModel =
    mongoose.model<IManualDeliveryCounter>(
        "ManualDeliveryCounter",
        manualDeliveryCounterSchema
    );
