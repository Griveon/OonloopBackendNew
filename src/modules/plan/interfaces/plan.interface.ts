import { Document, Types } from "mongoose";

export interface IPlan {
    name: string;
    displayName: string;
    description?: string;

    price: number;
    currency: Types.ObjectId;
    billingCycle: "monthly" | "yearly";

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPlanDocument extends IPlan, Document { }