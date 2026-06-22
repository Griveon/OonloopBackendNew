import mongoose, {
    Schema,
    Model,
} from "mongoose";

import type {
    IDriverWalletDocument,
} from "../interfaces/driverwallet.interface.js";

const DriverWalletSchema =
    new Schema<IDriverWalletDocument>(
        {
            driver: {
                type: Schema.Types.ObjectId,
                ref: "DriverProfile",
                required: true,
                unique: true,
                index: true,
            },

            balance: {
                type: Number,
                default: 0,
                min: 0,
            },

            totalEarned: {
                type: Number,
                default: 0,
            },

            totalWithdrawn: {
                type: Number,
                default: 0,
            },

            totalBonuses: {
                type: Number,
                default: 0,
            },

            totalPenalties: {
                type: Number,
                default: 0,
            },
        },
        {
            timestamps: true,
        }
    );

export const DriverWalletModel: Model<IDriverWalletDocument> =
    mongoose.model<IDriverWalletDocument>(
        "DriverWallet",
        DriverWalletSchema
    );