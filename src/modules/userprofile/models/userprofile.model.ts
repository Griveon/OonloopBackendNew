import mongoose, { Schema, Model } from "mongoose";
import type {
    IImage,
    IAddress,
    IUserProfileDocument,
} from "../interfaces/userprofile.interface.js";

const imageSchema = new Schema<IImage>(
    {
        url: { type: String, required: true },
        name: { type: String, default: "" },
        alt: { type: String, default: "" },
        isPrimary: { type: Boolean, default: false },
    },
    { _id: false }
);

const addressSchema = new Schema<IAddress>(
    {
        label: {
            type: String,
            enum: ["home", "work", "other"],
            default: "home",
        },

        fullName: String,
        mobileNumber: String,

        addressLine1: { type: String, required: true },
        addressLine2: String,

        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        postalCode: { type: String, required: true },

        location: {
            lat: {
                type: Number,
                required: true,
                min: -90,
                max: 90,
            },
            lng: {
                type: Number,
                required: true,
                min: -180,
                max: 180,
            },
        },

        isDefault: { type: Boolean, default: false },
    },
    { _id: true }
);

const UserProfileSchema: Schema<IUserProfileDocument> = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        bio: {
            type: String,
            maxlength: 500,
        },

        profileImage: imageSchema,
        coverImage: imageSchema,

        gallery: [imageSchema],

        addresses: [addressSchema],

        companyName: String,
        vehicleDetails: String,

        socialLinks: {
            linkedin: String,
            twitter: String,
            instagram: String,
            website: String,
        },

        preferences: {
            language: { type: String, default: "en" },
            notificationsEnabled: { type: Boolean, default: true },
        },
    },
    {
        timestamps: true,
    }
);

UserProfileSchema.pre("save", async function () {
    const doc = this as IUserProfileDocument;

    if (doc.addresses && doc.addresses.length > 0) {
        const defaultCount = doc.addresses.filter(
            (a) => a.isDefault
        ).length;

        if (defaultCount > 1) {
            throw new Error("Only one default address allowed");
        }
    }
});

export const UserProfileModel: Model<IUserProfileDocument> =
    mongoose.models.UserProfile ||
    mongoose.model<IUserProfileDocument>(
        "UserProfile",
        UserProfileSchema
    );