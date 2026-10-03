import { Document } from "mongoose";

export interface IImage {
    url: string;
    name?: string;
    alt?: string;
    isPrimary?: boolean;
    position?: number;
}

export interface IVendorCategoryAdditionalHandling {
    enabled: boolean;
    percentage: number;
    maxAmount: number;
}

export interface IVendorCategory {
    name: string;

    icon?: IImage[];

    additionalHandling?: IVendorCategoryAdditionalHandling;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IVendorCategoryDocument
    extends IVendorCategory,
    Document { }
