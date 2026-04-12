import { Document, Types } from "mongoose";

export interface IWishlistItem {
    product: Types.ObjectId;
    variant?: Types.ObjectId;

    name: string;
    image?: string;

    price?: number;
    addedAt?: Date;
}

export interface IWishlist {
    user: Types.ObjectId;

    items: IWishlistItem[];

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IWishlistDocument extends IWishlist, Document { }