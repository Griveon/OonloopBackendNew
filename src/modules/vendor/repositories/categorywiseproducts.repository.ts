import mongoose from "mongoose";
import { ProductModel } from "../../product/models/product.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { ProductCategoryModel } from "../../productcategories/models/productcategory.model.js";

export class CategoryProductsRepository {
    async findSubCategories(categoryId: string) {
        const match: any = {
            isActive: true,
        };

        if (categoryId && categoryId !== "all") {
            match.vendorCategory = new mongoose.Types.ObjectId(categoryId);
        }

        const subCategories = await ProductCategoryModel.find(match)
            .select("_id vendorCategory l1Category l2Category l3Category l4Category icon")
            .sort({
                "l1Category.name": 1,
                "l2Category.name": 1,
                "l3Category.name": 1,
                "l4Category.name": 1,
            })
            .lean();

        return subCategories;
    }

    async findByCategory(
        categoryId: string,
        productCategoryId: string,
        lat: number,
        lng: number,
        maxDistance: number,
        skip: number,
        limit: number,
        search: string,
        vendorId?: string,
        l2CategoryId?: string,
        l2CategoryName?: string
    ) {
        let vendorIds: mongoose.Types.ObjectId[] = [];

        if (vendorId) {
            vendorIds = [new mongoose.Types.ObjectId(vendorId)];
        } else {
            const nearbyVendors = await VendorProfileModel.find({
                "storeLocationAddress.location": {
                    $geoWithin: {
                        $centerSphere: [
                            [lng, lat],
                            maxDistance / 6378100,
                        ],
                    },
                },
            }).select("user");

            vendorIds = nearbyVendors
                .map((v) => v.user)
                .filter(Boolean)
                .map((id) => new mongoose.Types.ObjectId(id));
        }

        if (!vendorIds.length) {
            return {
                products: [],
                total: 0,
            };
        }

        const match: any = {
            vendorId: {
                $in: vendorIds,
            },
            isActive: true,
        };

        if (categoryId && categoryId !== "all") {
            match.category = new mongoose.Types.ObjectId(categoryId);
        }

        /**
         * Priority:
         * 1. If frontend sends exact productCategoryId/subcategoryId, filter by that.
         * 2. Else if frontend sends l2CategoryId/l2CategoryName, find all ProductCategory IDs under that L2.
         */
        if (productCategoryId && productCategoryId !== "all") {
            match.productCategory = new mongoose.Types.ObjectId(productCategoryId);
        } else if (
            (l2CategoryId && l2CategoryId !== "all") ||
            (l2CategoryName && l2CategoryName.trim())
        ) {
            const l2Match: any = {
                isActive: true,
            };

            if (categoryId && categoryId !== "all") {
                l2Match.vendorCategory = new mongoose.Types.ObjectId(categoryId);
            }

            if (l2CategoryId && l2CategoryId !== "all") {
                l2Match["l2Category._id"] = new mongoose.Types.ObjectId(l2CategoryId);
            }

            if (l2CategoryName && l2CategoryName.trim()) {
                l2Match["l2Category.name"] = {
                    $regex: `^${l2CategoryName.trim()}$`,
                    $options: "i",
                };
            }

            const l2ProductCategories = await ProductCategoryModel.find(l2Match)
                .select("_id")
                .lean();

            const l2ProductCategoryIds = l2ProductCategories.map((cat) => cat._id);

            if (!l2ProductCategoryIds.length) {
                return {
                    products: [],
                    total: 0,
                };
            }

            match.productCategory = {
                $in: l2ProductCategoryIds,
            };
        }

        const searchText = search?.trim();

        if (searchText) {
            const searchRegex = new RegExp(searchText, "i");

            const matchingProductCategories = await ProductCategoryModel.find({
                isActive: true,
                ...(categoryId && categoryId !== "all"
                    ? { vendorCategory: new mongoose.Types.ObjectId(categoryId) }
                    : {}),
                $or: [
                    { "l1Category.name": searchRegex },
                    { "l2Category.name": searchRegex },
                    { "l3Category.name": searchRegex },
                    { "l4Category.name": searchRegex },
                ],
            })
                .select("_id")
                .lean();

            const matchingProductCategoryIds = matchingProductCategories.map(
                (cat) => cat._id
            );

            match.$or = [
                {
                    name: {
                        $regex: searchText,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: searchText,
                        $options: "i",
                    },
                },
            ];

            if (matchingProductCategoryIds.length > 0) {
                match.$or.push({
                    productCategory: {
                        $in: matchingProductCategoryIds,
                    },
                });
            }
        }

        const [products, total] = await Promise.all([
            ProductModel.find(match)
                .populate("productCategory")
                .populate("category")
                .populate("unit")
                .populate("ribbon")
                .sort({
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limit)
                .lean(),

            ProductModel.countDocuments(match),
        ]);

        return {
            products,
            total,
        };
    }
}