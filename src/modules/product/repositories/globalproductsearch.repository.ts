import { ProductModel } from "../models/product.model.js";

export class ProductSearchRepository {

    async SearchProducts(
        keyword: string,
        page: number,
        limit: number
    ) {

        const skip = (page - 1) * limit;

        const query = {
            isActive: true,
            $text: {
                $search: keyword,
            },
        };

        const [products, total] = await Promise.all([
            ProductModel.find(
                query,
                {
                    score: { $meta: "textScore" },
                }
            )
                .sort({
                    score: { $meta: "textScore" },
                })
                .skip(skip)
                .limit(limit)
                .populate("productCategory")
                .populate("category")
                .populate("unit")
                .lean(),

            ProductModel.countDocuments(query),
        ]);

        return {
            products,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

}