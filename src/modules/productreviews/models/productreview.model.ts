import mongoose, { Schema, Model } from "mongoose";
import type { IProductReview } from "../interfaces/productreview.interface.js";

const reviewImageSchema = new Schema(
    {
        url: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            default: "",
        },
    },
    {
        _id: false,
    }
);

const productReviewSchema = new Schema<IProductReview>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },

        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        order: {
            type: Schema.Types.ObjectId,
            ref: "Order",
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },

        title: {
            type: String,
            default: "",
        },

        review: {
            type: String,
            default: "",
        },

        images: [reviewImageSchema],

        likes: {
            type: Number,
            default: 0,
        },

        isVerifiedPurchase: {
            type: Boolean,
            default: false,
        },

        isApproved: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

productReviewSchema.index(
    {
        product: 1,
        user: 1,
    },
    {
        unique: true,
    }
);

export const ProductReviewModel: Model<IProductReview> =
    mongoose.model<IProductReview>(
        "ProductReview",
        productReviewSchema
    );