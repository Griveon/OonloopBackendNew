import { Document } from "mongoose";

export interface IImage {
    url: string;
    name?: string;
    alt?: string;
    isPrimary?: boolean;
    position?: number;
}

export interface IVendorCategory {
    name: string;

    icon?: IImage[];

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IVendorCategoryDocument
    extends IVendorCategory,
    Document { }