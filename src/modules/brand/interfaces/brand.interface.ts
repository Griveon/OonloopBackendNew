import { Document, Types } from "mongoose";

export interface IImage {
    url: string;
    name?: string;
    alt?: string;
    isPrimary?: boolean;
    position?: number;
}

export interface IBrand {
    name: string;
    slug?: string;
    description?: string;

    logo?: IImage;
    banners?: IImage[];

    website?: string;

    vendorId: Types.ObjectId;

    metaTitle?: string;
    metaDescription?: string;

    tags?: string[];

    ratings?: number;
    totalProducts?: number;

    isFeatured?: boolean;
    isActive?: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IBrandDocument extends IBrand, Document { }