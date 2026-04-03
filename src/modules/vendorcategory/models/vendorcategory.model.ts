import mongoose, { Schema, Model } from "mongoose";
import type { IVendorCategoryDocument } from "../interfaces/vendorcategory.interface.js";

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

const VendorCategorySchema: Schema<IVendorCategoryDocument> =
    new Schema(
        {
            name: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },

            // keep ready for future
            icon: {
                type: [imageSchema],
                default: [],
            },

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },
        },
        { timestamps: true }
    );

// Optional: prevent duplicate names
VendorCategorySchema.index({ name: 1 }, { unique: true });

export const VendorCategoryModel: Model<IVendorCategoryDocument> =
    mongoose.model<IVendorCategoryDocument>(
        "VendorCategory",
        VendorCategorySchema
    );