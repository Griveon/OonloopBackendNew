import mongoose, { Schema, Model } from "mongoose";
import type { ICartDocument, ICartItem } from "../interfaces/cart.interface.js";

const cartItemSchema = new Schema<ICartItem>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        variant: {
            type: Schema.Types.ObjectId,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        price: {
            type: Number,
            required: true,
        },

        mrp: {
            type: Number,
        },

        name: {
            type: String,
            required: true,
        },

        image: {
            type: String,
        },

        gstPercent: Number,
        gstAmount: Number,

        total: {
            type: Number,
            required: true,
        },
    },
    { _id: true }
);

const cartSchema = new Schema<ICartDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        items: [cartItemSchema],

        totalItems: {
            type: Number,
            default: 0,
        },

        subTotal: {
            type: Number,
            default: 0,
        },

        totalGST: {
            type: Number,
            default: 0,
        },

        grandTotal: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

cartSchema.pre("save", async function (this: ICartDocument) {
    this.totalItems = this.items.reduce(
        (sum, i) => sum + i.quantity,
        0
    );

    this.subTotal = this.items.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
    );

    this.totalGST = this.items.reduce(
        (sum, i) => sum + (i.gstAmount || 0),
        0
    );

    this.grandTotal = this.subTotal + this.totalGST;
});

export const CartModel: Model<ICartDocument> =
    mongoose.models.Cart ||
    mongoose.model<ICartDocument>("Cart", cartSchema);