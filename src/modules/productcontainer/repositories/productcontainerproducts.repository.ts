import mongoose from "mongoose";
import { ProductContainerModel } from "../models/productcontainer.model.js";
import { ProductModel } from "../../product/models/product.model.js";
import { ProductContainerType } from "../interfaces/productcontainer.interface.js";

export class ProductContainerProductsRepository {

    async getProducts(
        containerId: string,
        skip: number,
        limit: number,
        search = ""
    ) {

        const container =
            await ProductContainerModel.findById(containerId);

        if (!container) {
            throw new Error("Container not found");
        }

        let match: any = {
            isActive: true,
        };

        switch (container.type) {

            case ProductContainerType.CATEGORY:
                match.category = {
                    $in: container.categories || [],
                };
                break;

            case ProductContainerType.PRODUCT_CATEGORY:
                match.productCategory = {
                    $in: container.productCategories || [],
                };
                break;

            case ProductContainerType.PRODUCTS:
                match._id = {
                    $in: container.products || [],
                };
                break;

            default:
                throw new Error(
                    "Invalid container type"
                );
        }

        // Search filter
        if (search.trim()) {
            match.$or = [
                {
                    name: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    slug: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        const [products, total] =
            await Promise.all([

                ProductModel.find(match)
                    .populate("category")
                    .populate("productCategory")
                    .populate("unit")
                    .sort({
                        createdAt: -1,
                    })
                    .skip(skip)
                    .limit(limit)
                    .lean(),

                ProductModel.countDocuments(match),
            ]);

        return {
            container,
            products,
            total,
        };
    }
}