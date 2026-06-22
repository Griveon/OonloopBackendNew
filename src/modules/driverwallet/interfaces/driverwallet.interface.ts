import { Document, Types } from "mongoose";

export interface IDriverWallet {
    driver: Types.ObjectId;

    balance: number;

    totalEarned: number;

    totalWithdrawn: number;

    totalBonuses: number;

    totalPenalties: number;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IDriverWalletDocument
    extends IDriverWallet,
    Document { }