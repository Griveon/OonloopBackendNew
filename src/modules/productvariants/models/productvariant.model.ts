import mongoose, { Schema, Model } from "mongoose";
import type { IProductVariantDocument } from "../interfaces/productvariant.interface.js";

const variantOptionSchema = new Schema(
    {
        value: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        meta: { type: Schema.Types.Mixed },
        isActive: { type: Boolean, default: true }
    },
    { _id: false }
);

const ProductVariantSchema: Schema<IProductVariantDocument> =
    new Schema(
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

            label: {
                type: String,
                required: true,
                trim: true,
            },

            inputType: {
                type: String,
                enum: ["text", "number", "select", "color"],
                required: true,
                index: true,
            },

            options: {
                type: [variantOptionSchema],
                default: [],
            },

            isRequired: {
                type: Boolean,
                default: false,
            },

            isFilterable: {
                type: Boolean,
                default: true,
                index: true,
            },

            isGlobal: {
                type: Boolean,
                default: true,
                index: true,
            },

            vendorId: {
                type: Schema.Types.ObjectId,
                ref: "User",
                index: true,
            },

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },
        },
        { timestamps: true }
    );

ProductVariantSchema.index(
    { name: 1, vendorId: 1 },
    { unique: true }
);

export const ProductVariantModel: Model<IProductVariantDocument> =
    mongoose.model<IProductVariantDocument>(
        "ProductVariant",
        ProductVariantSchema
    );