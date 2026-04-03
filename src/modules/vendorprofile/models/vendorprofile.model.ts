import mongoose, { Schema, Model } from "mongoose";
import type { IVendorDocument } from "../interfaces/vendorprofile.interface.js";

const imageSchema = new Schema(
    {
        url: { type: String, required: true },
        name: { type: String, default: "" },
        alt: { type: String, default: "" },
        isPrimary: { type: Boolean, default: false },
        position: { type: Number, default: 0 },
    },
    { _id: false }
);

const locationSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            default: [0, 0],
        },
    },
    { _id: false }
);

const storeAddressSchema = new Schema(
    {
        addressLine1: { type: String, required: true, trim: true },
        addressLine2: { type: String, trim: true },
        landmark: { type: String, trim: true },

        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        country: { type: String, default: "India" },

        postalCode: {
            type: String,
            required: true,
            match: [/^\d{4,8}$/, "Invalid postal code"],
        },

        latitude: Number,
        longitude: Number,

        location: locationSchema,
    },
    { _id: false }
);

const kycDocumentSchema = new Schema(
    {
        fileUrl: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        adminRemark: { type: String, default: "" },
        updatedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const VendorSchema: Schema<IVendorDocument> = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        businessType: {
            type: String,
            enum: [
                "individual",
                "proprietorship",
                "partnership",
                "private_limited",
                "llp",
                "public_limited"
            ],
            required: true,
        },

        storeName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
        },

        storeSlug: {
            type: String,
            lowercase: true,
        },

        storeLogo: { type: String, default: "" },

        storeImages: [imageSchema],

        storeLocationAddress: {
            type: storeAddressSchema,
            required: true,
        },

        gstNumber: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
            match: [
                /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                "Invalid GST number",
            ],
        },

        panNumber: {
            type: String,
            trim: true,
            uppercase: true,
            unique: true,
            sparse: true,
            match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN"],
        },

        workingHours: {
            openingTime: String,
            closingTime: String,
        },

        workingDays: {
            type: [String],
            enum: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ],
            default: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ],
        },

        bankDetails: {
            accountHolder: String,
            bankName: String,
            accountNumber: {
                type: String,
                match: [/^\d{9,18}$/, "Invalid account number"],
            },
            ifsc: {
                type: String,
                match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC"],
            },
        },

        // 📄 KYC
        kycDocuments: {
            gstCertificate: kycDocumentSchema,
            panCard: kycDocumentSchema,
            cancelledCheque: kycDocumentSchema,
            storeRegistration: kycDocumentSchema,
            aadhaarCard: kycDocumentSchema,
            tradeLicense: kycDocumentSchema,
            udyamAadhaar: kycDocumentSchema,
            shopActLicense: kycDocumentSchema,
            certificateOfIncorporation: kycDocumentSchema
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
            enum: ["pending", "approved", "rejected", "suspended"],
            default: "pending",
            index: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

VendorSchema.index({ "storeLocationAddress.location": "2dsphere" });

export const VendorProfileModel: Model<IVendorDocument> =
    mongoose.model<IVendorDocument>("VendorProfile", VendorSchema);