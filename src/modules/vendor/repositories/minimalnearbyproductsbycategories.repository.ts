import mongoose from "mongoose";
import { ProductModel } from "../../product/models/product.model.js";

export class MinimalNearbyProductsByCategoriesRepository {

    async getCategoryWiseNearbyProducts(
        vendorIds: any[],
        limitPerCategory = 10
    ) {

        const objectIds = vendorIds.map(
            id => new mongoose.Types.ObjectId(id)
        );

        console.log("User IDs used for product match:", objectIds);

        const test = await ProductModel.find({
            vendorId: { $in: objectIds },
            isActive: true
        }).limit(10);

        console.log("Sample products found:", test);

        return await ProductModel.aggregate([

            {
                $match: {
                    vendorId: { $in: objectIds },
                    isActive: true
                }
            },

            // PRODUCT CATEGORY
            {
                $lookup: {
                    from: "productcategories",
                    localField: "productCategory",
                    foreignField: "_id",
                    as: "categoryData"
                }
            },

            {
                $unwind: {
                    path: "$categoryData",
                    preserveNullAndEmptyArrays: true
                }
            },

            // VENDOR CATEGORY
            {
                $lookup: {
                    from: "vendorcategories",
                    localField: "categoryData.vendorCategory",
                    foreignField: "_id",
                    as: "vendorCategoryData"
                }
            },

            {
                $unwind: {
                    path: "$vendorCategoryData",
                    preserveNullAndEmptyArrays: true
                }
            },

            // SORT PRODUCTS FIRST
            {
                $sort: {
                    isFeatured: -1,
                    isTrending: -1,
                    createdAt: -1
                }
            },

            // GROUP CATEGORY
            {
                $group: {
                    _id: "$categoryData._id",

                    category: {
                        $first: {
                            _id: "$categoryData._id",
                            name: "$categoryData.name",
                            image: "$categoryData.icon",

                            vendorCategory: {
                                _id: "$vendorCategoryData._id",
                                name: "$vendorCategoryData.name",
                                icon: "$vendorCategoryData.icon"
                            }
                        }
                    },

                    totalProducts: {
                        $sum: 1
                    },

                    products: {
                        $push: {
                            _id: "$_id",
                            name: "$name",
                            price: "$price",
                            mrp: "$mrp",
                            images: "$images",
                            vendorId: "$vendorId",
                            isFeatured: "$isFeatured",
                            isTrending: "$isTrending",
                            createdAt: "$createdAt"
                        }
                    }
                }
            },

            // LIMIT TO 10 PRODUCTS PER CATEGORY
            {
                $project: {
                    _id: 0,
                    category: 1,
                    totalProducts: 1,

                    products: {
                        $slice: ["$products", limitPerCategory]
                    }
                }
            }

        ]);
    }
}