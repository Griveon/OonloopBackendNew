import { Document, Types } from "mongoose";

export type ItemSource = "catalog" | "typed" | "uploaded";

export type ItemStatus =
    | "requested"
    | "available"
    | "unavailable"
    | "purchased";

export interface IBuyForMeItem {
    request: Types.ObjectId;       // FK -> BuyForMeRequest

    source: ItemSource;
    product?: Types.ObjectId;      // only for source = "catalog"
    variant?: Types.ObjectId;

    name: string;
    quantity: number;
    unit?: string;                 // kg, L, g, piece…
    image?: string;                // product image OR the uploaded list image

    estimatedPrice?: number;       // catalog reference price
    status: ItemStatus;
    actualPrice?: number;          // what the shopper actually paid
    note?: string;                 // shopper note (e.g. brand swap)

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IBuyForMeItemDocument extends IBuyForMeItem, Document { }
