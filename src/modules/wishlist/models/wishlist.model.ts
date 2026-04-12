import mongoose, { Schema, Model } from "mongoose";
import type { IWishlistDocument, IWishlistItem } from "../interfaces/wishlist.interface.js";

const wishlistItemSchema = new Schema<IWishlistItem>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        variant: {
            type: Schema.Types.ObjectId,
        },

        name: {
            type: String,
            required: true,
        },

        image: String,
        price: Number,

        addedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const wishlistSchema = new Schema<IWishlistDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        items: [wishlistItemSchema],
    },
    {
        timestamps: true,
    }
);

export const WishlistModel: Model<IWishlistDocument> =
    mongoose.models.Wishlist ||
    mongoose.model<IWishlistDocument>("Wishlist", wishlistSchema);