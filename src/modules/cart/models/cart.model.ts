import mongoose, { Schema, Model } from "mongoose";
import type { ICartDocument, ICartItem } from "../interfaces/cart.interface.js";

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const calculateCartTotals = (items: ICartItem[]) => {
    const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const subTotal = roundMoney(items.reduce(
        (sum, item) => sum + Number(item.customerSellingPrice ?? item.price ?? 0) * item.quantity,
        0
    ));
    const totalGST = roundMoney(items.reduce(
        (sum, item) => sum + Number(item.gstAmount || 0) * item.quantity,
        0
    ));

    return { totalItems, subTotal, totalGST, grandTotal: roundMoney(subTotal + totalGST) };
};

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

        customerSellingPrice: {
            type: Number,
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
        optimisticConcurrency: true,
    }
);

cartSchema.pre("save", async function (this: ICartDocument) {
    const totals = calculateCartTotals(this.items);
    this.totalItems = totals.totalItems;
    this.subTotal = totals.subTotal;
    this.totalGST = totals.totalGST;
    this.grandTotal = totals.grandTotal;
});

export const CartModel: Model<ICartDocument> =
    mongoose.models.Cart ||
    mongoose.model<ICartDocument>("Cart", cartSchema);
