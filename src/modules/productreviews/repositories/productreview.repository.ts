import { ProductReviewModel } from "../models/productreview.model.js";
import type { IProductReview } from "../interfaces/productreview.interface.js";

export class ProductReviewRepository {

    async create(data: IProductReview) {
        return ProductReviewModel.create(data);
    }

    async findById(id: string) {
        return ProductReviewModel.findById(id)
            .populate("user", "name profileImage");
    }

    async update(id: string, data: Partial<IProductReview>) {
        return ProductReviewModel.findByIdAndUpdate(
            id,
            data,
            { new: true }
        );
    }

    async delete(id: string) {
        return ProductReviewModel.findByIdAndDelete(id);
    }

    async getProductReviews(
        productId: string,
        page = 1,
        limit = 10
    ) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            ProductReviewModel.find({
                product: productId,
                isApproved: true,
            })
                .populate("user", "firstName lastName middleName profileImage")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            ProductReviewModel.countDocuments({
                product: productId,
                isApproved: true,
            }),
        ]);

        return {
            items,
            total,
            page,
            limit,
        };
    }

    async getReviewSummary(productId: string) {
        const result = await ProductReviewModel.aggregate([
            {
                $match: {
                    product: ProductReviewModel.db.base.Types.ObjectId.createFromHexString(productId),
                    isApproved: true,
                },
            },
            {
                $group: {
                    _id: null,

                    averageRating: {
                        $avg: "$rating",
                    },

                    totalReviews: {
                        $sum: 1,
                    },

                    fiveStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 5] }, 1, 0],
                        },
                    },

                    fourStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 4] }, 1, 0],
                        },
                    },

                    threeStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 3] }, 1, 0],
                        },
                    },

                    twoStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 2] }, 1, 0],
                        },
                    },

                    oneStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 1] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        return result[0] || {
            averageRating: 0,
            totalReviews: 0,
            fiveStar: 0,
            fourStar: 0,
            threeStar: 0,
            twoStar: 0,
            oneStar: 0,
        };
    }

    async findByUserAndProduct(
        userId: string,
        productId: string
    ) {
        return ProductReviewModel.findOne({
            user: userId,
            product: productId,
        });
    }
}