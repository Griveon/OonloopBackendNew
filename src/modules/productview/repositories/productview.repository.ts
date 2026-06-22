import { ProductViewModel } from "../models/productview.model.js";

export class ProductViewRepository {

    async addView(
        userId: string,
        productId: string
    ) {

        return ProductViewModel.findOneAndUpdate(
            {
                user: userId,
                product: productId,
            },
            {
                viewedAt: new Date(),
            },
            {
                upsert: true,
                new: true,
            }
        );
    }

    async getRecentlyViewed(
        userId: string,
        limit: number = 20
    ) {

        return ProductViewModel.find({
            user: userId,
        })
            .sort({
                viewedAt: -1,
            })
            .limit(limit)
            .populate({
                path: "product",
                populate: [
                    {
                        path: "productCategory",
                    },
                    {
                        path: "category",
                    },
                    {
                        path: "unit",
                    },
                ],
            });
    }

    async deleteOldViews(
        userId: string,
        keep: number = 50
    ) {

        const views =
            await ProductViewModel.find({
                user: userId,
            })
                .sort({
                    viewedAt: -1,
                });

        if (views.length <= keep) {
            return;
        }

        const idsToDelete =
            views
                .slice(keep)
                .map(
                    item => item._id
                );

        await ProductViewModel.deleteMany({
            _id: {
                $in: idsToDelete,
            },
        });
    }
}