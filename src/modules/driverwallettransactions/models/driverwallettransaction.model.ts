import mongoose, {
    Schema,
    Model,
} from "mongoose";

import type {
    IDriverWalletTransactionDocument,
} from "../interfaces/driverwallettransaction.interface.js";

const DriverWalletTransactionSchema =
    new Schema<IDriverWalletTransactionDocument>(
        {
            wallet: {
                type: Schema.Types.ObjectId,
                ref: "DriverWallet",
                required: true,
            },

            driver: {
                type: Schema.Types.ObjectId,
                ref: "DriverProfile",
                required: true,
            },

            type: {
                type: String,
                enum: [
                    "credit",
                    "debit",
                    "withdrawal",
                    "bonus",
                    "penalty",
                ],
                required: true,
            },

            amount: {
                type: Number,
                required: true,
            },

            description: {
                type: String,
                default: "",
            },

            orderId: {
                type: Schema.Types.ObjectId,
                ref: "Order",
            },

            balanceAfterTransaction: {
                type: Number,
                required: true,
            },
        },
        {
            timestamps: true,
        }
    );

export const DriverWalletTransactionModel: Model<IDriverWalletTransactionDocument> =
    mongoose.model<IDriverWalletTransactionDocument>(
        "DriverWalletTransaction",
        DriverWalletTransactionSchema
    );