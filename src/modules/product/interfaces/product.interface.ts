import { Types } from "mongoose";

// Variant interface with images
export interface IProductVariant {
    attributes: Record<string, any>;
    images?: IProductImage[];          // Each variant can have multiple images
    unit?: Types.ObjectId;
    unitValue?: number;
    stock?: number;
    sku?: string;
    price?: number;
    mrp?: number;
}
export interface IProductVideo {
    productId?: Types.ObjectId;
    url: string;
    name?: string;
    type?: string;
    isPrimary?: boolean;
    position?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
// Product image interface
export interface IProductImage {
    productId?: Types.ObjectId;        // Optional here, used if images are stored separately
    url: string;
    name?: string;
    alt?: string;
    isPrimary?: boolean;               // Main image
    position?: number;                 // Order in gallery
    createdAt?: Date;
    updatedAt?: Date;
}

// Product attributes interface
export interface IProductAttributes {
    brand?: Types.ObjectId;
    material?: string;
    pattern?: string;
    sleeveLength?: string;
    fit?: string;
}

// GST details interface
export interface IGSTDetails {
    gstRuleId: Types.ObjectId;
    hsnCode: string;
    gstPercent: number;
    gstAmount: number;
    priceIncludingGST: number;
}

// Main product interface
export interface IProduct {
    vendorId: Types.ObjectId;
    productCategory: Types.ObjectId;
    category: Types.ObjectId;
    name: string;
    description?: string;
    variants?: IProductVariant[];
    attributes?: IProductAttributes;
    images: IProductImage[];
    videos: IProductVideo[],
    mrp?: number;
    stock?: number;
    isActive?: boolean;
    isFeatured?: boolean;
    isTrending?: boolean;
    isMainCatalogProduct: boolean;
    returnable?: boolean;
    ribbon?: Types.ObjectId;
    unit?: Types.ObjectId;
    minQty?: number;
    slug: string;
    gst?: IGSTDetails;
    availability: any;
}

export type ProductAvailabilityType = "always" | "scheduled";

export interface IProductAvailability {
    type: ProductAvailabilityType;
    fromTime?: string;      // HH:mm
    toTime?: string;        // HH:mm
    fromMinutes?: number;   // calculated backend
    toMinutes?: number;     // calculated backend
}