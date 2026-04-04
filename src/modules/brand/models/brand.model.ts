import mongoose, { Schema, Model } from "mongoose";
import type { IBrandDocument } from "../interfaces/brand.interface.js";

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

const BrandSchema: Schema<IBrandDocument> = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        slug: {
            type: String,
            trim: true,
            index: true,
        },

        description: {
            type: String,
            default: "",
        },

        logo: {
            type: imageSchema,
        },

        banners: {
            type: [imageSchema],
            default: [],
        },

        website: {
            type: String,
            default: "",
        },

        vendorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        metaTitle: String,
        metaDescription: String,

        tags: {
            type: [String],
            default: [],
        },

        ratings: {
            type: Number,
            default: 0,
        },

        totalProducts: {
            type: Number,
            default: 0,
        },

        isFeatured: {
            type: Boolean,
            default: false,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

BrandSchema.index({ name: 1, vendorId: 1 }, { unique: true });

export const BrandModel: Model<IBrandDocument> =
    mongoose.model<IBrandDocument>("Brand", BrandSchema);