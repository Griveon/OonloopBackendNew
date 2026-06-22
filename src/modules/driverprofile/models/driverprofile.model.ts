import mongoose, { Schema, Model } from "mongoose";
import type { IDriverDocument } from "../interfaces/driverprofile.interface.js";

const kycDocumentSchema = new Schema(
    {
        fileUrl: {
            type: String,
            required: true,
            trim: true,
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },

        adminRemark: {
            type: String,
            default: "",
            trim: true,
        },

        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const bankDetailsSchema = new Schema(
    {
        accountHolder: {
            type: String,
            trim: true,
        },

        bankName: {
            type: String,
            trim: true,
        },

        accountNumber: {
            type: String,
            trim: true,
            match: [/^\d{9,18}$/, "Invalid account number"],
        },

        ifsc: {
            type: String,
            trim: true,
            uppercase: true,
            match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"],
        },
    },
    { _id: false }
);

const currentLocationSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },

        coordinates: {
            type: [Number],
            default: [0, 0],
            validate: {
                validator(value: number[]) {
                    return value.length === 2;
                },
                message: "Coordinates must contain longitude and latitude",
            },
        },
    },
    { _id: false }
);

const DriverProfileSchema: Schema<IDriverDocument> = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        profileImage: {
            type: String,
            default: "",
        },

        drivingLicenseNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },

        drivingLicenseExpiry: {
            type: Date,
        },

        aadhaarNumber: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
            match: [/^\d{12}$/, "Invalid Aadhaar number"],
        },

        panNumber: {
            type: String,
            trim: true,
            uppercase: true,
            unique: true,
            sparse: true,
            match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number"],
        },

        vehicleType: {
            type: String,
            enum: ["bike", "car", "auto", "truck", "van"],
            required: true,
        },

        vehicleNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        vehicleModel: {
            type: String,
            trim: true,
        },

        vehicleBrand: {
            type: String,
            trim: true,
        },

        vehicleYear: {
            type: Number,
            min: 1990,
            max: new Date().getFullYear() + 1,
        },

        bankDetails: bankDetailsSchema,

        currentLocation: {
            type: currentLocationSchema,
            default: {
                type: "Point",
                coordinates: [0, 0],
            },
        },

        kycDocuments: {
            aadhaarCard: kycDocumentSchema,

            panCard: kycDocumentSchema,

            drivingLicense: kycDocumentSchema,

            rcBook: kycDocumentSchema,

            insurance: kycDocumentSchema,

            vehiclePermit: kycDocumentSchema,

            pollutionCertificate: kycDocumentSchema,

            profilePhoto: kycDocumentSchema,
        },

        isKycSubmitted: {
            type: Boolean,
            default: false,
        },

        isKycApproved: {
            type: Boolean,
            default: false,
        },

        profileStatus: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
                "suspended",
            ],
            default: "pending",
            index: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        isOnline: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

DriverProfileSchema.index({
    currentLocation: "2dsphere",
});

export const DriverProfileModel: Model<IDriverDocument> =
    mongoose.model<IDriverDocument>(
        "DriverProfile",
        DriverProfileSchema
    );