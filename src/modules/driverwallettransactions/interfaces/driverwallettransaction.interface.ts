import { Document, Types } from "mongoose";

export type WalletTransactionType =
    | "credit"
    | "debit"
    | "withdrawal"
    | "bonus"
    | "penalty";

export interface IDriverWalletTransaction {
    wallet: Types.ObjectId;

    driver: Types.ObjectId;

    type: WalletTransactionType;

    amount: number;

    description?: string;

    orderId?: Types.ObjectId;

    balanceAfterTransaction: number;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IDriverWalletTransactionDocument
    extends IDriverWalletTransaction,
    Document { }