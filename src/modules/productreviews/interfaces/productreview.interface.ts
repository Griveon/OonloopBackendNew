import { Types } from "mongoose";

export interface IReviewImage {
    url: string;
    name?: string;
}

export interface IProductReview {
    product: Types.ObjectId;
    user: Types.ObjectId;
    order?: Types.ObjectId;

    rating: number;

    title?: string;
    review?: string;

    images?: IReviewImage[];

    likes?: number;

    isVerifiedPurchase?: boolean;

    isApproved?: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}