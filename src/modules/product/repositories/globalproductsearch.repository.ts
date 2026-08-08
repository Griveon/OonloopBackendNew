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
            $or: [
                { name: { $regex: keyword, $options: "i" } },
                { description: { $regex: keyword, $options: "i" } },
                { slug: { $regex: keyword, $options: "i" } },
            ],
        };

        const [products, total] = await Promise.all([
            ProductModel.find(query)
                .skip(skip)
                .limit(limit)
                .populate("productCategory")
                .populate("category")
                .populate("unit")
                .populate({
                    path: "variants.unit",
                    select: "name shortName symbol unitValue",
                })
                .lean(),

            ProductModel.countDocuments(query),
        ]);

        console.log(query);

        return {
            products,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

}