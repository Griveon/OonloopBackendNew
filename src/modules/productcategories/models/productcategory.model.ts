import mongoose, { Schema, Model } from "mongoose";
import type { IProductCategoryDocument } from "../interfaces/productcategory.interface.js";

const categoryLevelSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        code: { type: String, required: true, uppercase: true, trim: true },
    },
    { _id: false }
);

const ProductCategorySchema: Schema<IProductCategoryDocument> =
    new Schema(
        {
            vendorCategory: {
                type: Schema.Types.ObjectId,
                ref: "VendorCategory",
                required: true,
                index: true,
            },

            l1Category: { type: categoryLevelSchema, required: true },
            l2Category: { type: categoryLevelSchema, required: true },
            l3Category: { type: categoryLevelSchema, required: true },
            l4Category: { type: categoryLevelSchema, required: true },

            icon: { type: String, default: "" },

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },
        },
        { timestamps: true }
    );


export const ProductCategoryModel: Model<IProductCategoryDocument> =
    mongoose.model<IProductCategoryDocument>(
        "ProductCategory",
        ProductCategorySchema
    );