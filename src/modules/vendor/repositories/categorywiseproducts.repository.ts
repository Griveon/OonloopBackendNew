import mongoose from "mongoose";
import { ProductModel } from "../../product/models/product.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { ProductCategoryModel } from "../../productcategories/models/productcategory.model.js";
import {
    escapeRegex,
    normalizeSearch,
    getSearchTerms,
} from "../../product/utils/productsearch.util.js";
import { isProductAvailableNow } from "../utils/timetominutes.util.js";

export class CategoryProductsRepository {
    async findSubCategories(categoryId: string) {
        const match: any = {
            isActive: true,
        };

        if (categoryId && categoryId !== "all") {
            match.vendorCategory = new mongoose.Types.ObjectId(categoryId);
        }

        const subCategories = await ProductCategoryModel.find(match)
            .select(
                "_id vendorCategory l1Category l2Category l3Category l4Category icon"
            )
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
        /*
         * ---------------------------------------------------------
         * PAGINATION
         * ---------------------------------------------------------
         */

        skip = Math.max(Number(skip) || 0, 0);

        limit = Math.min(Math.max(Number(limit) || 20, 1), 100);

        /*
         * ---------------------------------------------------------
         * FIND VENDORS
         * ---------------------------------------------------------
         */

        let vendorIds: mongoose.Types.ObjectId[] = [];

        if (vendorId) {
            vendorIds = [new mongoose.Types.ObjectId(vendorId)];
        } else {
            const nearbyVendors = await VendorProfileModel.find({
                "storeLocationAddress.location": {
                    $geoWithin: {
                        $centerSphere: [[lng, lat], maxDistance / 6378100],
                    },
                },
            })
                .select("user")
                .lean();

            vendorIds = nearbyVendors
                .map((vendor) => vendor.user)
                .filter(Boolean)
                .map((id) => new mongoose.Types.ObjectId(id));
        }

        /*
         * ---------------------------------------------------------
         * NO VENDORS AVAILABLE
         * ---------------------------------------------------------
         */

        if (!vendorIds.length) {
            return {
                products: [],
                total: 0,
            };
        }

        /*
         * ---------------------------------------------------------
         * BASE MATCH
         * ---------------------------------------------------------
         */

        const match: any = {
            vendorId: {
                $in: vendorIds,
            },

            isActive: true,
        };

        /*
         * ---------------------------------------------------------
         * VENDOR CATEGORY FILTER
         * ---------------------------------------------------------
         */

        if (categoryId && categoryId !== "all") {
            match.category = new mongoose.Types.ObjectId(categoryId);
        }

        /*
         * ---------------------------------------------------------
         * PRODUCT CATEGORY FILTER
         * ---------------------------------------------------------
         */

        if (
            productCategoryId &&
            productCategoryId !== "all"
        ) {
            match.productCategory = new mongoose.Types.ObjectId(
                productCategoryId
            );
        } else if (
            (l2CategoryId && l2CategoryId !== "all") ||
            (l2CategoryName && l2CategoryName.trim())
        ) {
            const l2Match: any = {
                isActive: true,
            };

            if (categoryId && categoryId !== "all") {
                l2Match.vendorCategory = new mongoose.Types.ObjectId(
                    categoryId
                );
            }

            console.log("l2CategoryId")
            console.log(l2CategoryId)
            console.log("l2CategoryName")
            console.log(l2CategoryName)
            if (l2CategoryId && l2CategoryId !== "all") {
                console.log("🔎 L2 CATEGORY CODE:", l2CategoryId);

                // l2CategoryId is actually the L2 category code,
                // e.g. "185", so don't try to convert it to ObjectId.
                l2Match["l2Category.code"] = String(l2CategoryId);
            } else if (l2CategoryName && l2CategoryName.trim()) {
                console.log(
                    "🔎 L2 CATEGORY NAME:",
                    l2CategoryName
                );

                // Escape the original name instead of using normalizeSearch(),
                // because normalizeSearch() removes "&".
                l2Match["l2Category.name"] = new RegExp(
                    escapeRegex(l2CategoryName.trim()),
                    "i"
                );
            }

            console.log("l2Match");
            console.log(l2Match);
            const l2ProductCategories =
                await ProductCategoryModel.find(l2Match)
                    .select("_id")
                    .lean();

            console.log("l2ProductCategories")
            console.log(l2ProductCategories)

            const l2ProductCategoryIds =
                l2ProductCategories.map(
                    (category) => category._id
                );

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

        /*
         * ---------------------------------------------------------
         * SEARCH
         * ---------------------------------------------------------
         */

        const normalizedSearch = normalizeSearch(search || "");

        if (normalizedSearch) {
            const searchTerms = getSearchTerms(normalizedSearch);

            const regexTerms = searchTerms.map(
                (term) =>
                    new RegExp(
                        escapeRegex(term),
                        "i"
                    )
            );

            const productCategorySearchConditions: any[] = [];

            for (const regex of regexTerms) {
                productCategorySearchConditions.push(
                    {
                        "l1Category.name": regex,
                    },
                    {
                        "l1Category.code": regex,
                    },
                    {
                        "l2Category.name": regex,
                    },
                    // {
                    //     "l2Category.code": regex,
                    // },
                    {
                        "l3Category.name": regex,
                    },
                    {
                        "l3Category.code": regex,
                    },
                    {
                        "l4Category.name": regex,
                    },
                    {
                        "l4Category.code": regex,
                    }
                );
            }

            const productCategoryQuery: any = {
                isActive: true,
                $or: productCategorySearchConditions,
            };

            if (categoryId && categoryId !== "all") {
                productCategoryQuery.vendorCategory =
                    new mongoose.Types.ObjectId(categoryId);
            }

            const matchingProductCategories =
                await ProductCategoryModel.find(
                    productCategoryQuery
                )
                    .select("_id")
                    .lean();

            const matchingProductCategoryIds =
                matchingProductCategories.map(
                    (category) => category._id
                );

            const searchConditions: any[] = [];

            for (const regex of regexTerms) {
                searchConditions.push(
                    {
                        name: regex,
                    },
                    {
                        description: regex,
                    },
                    {
                        slug: regex,
                    },
                    {
                        searchKeywords: regex,
                    },
                    {
                        "variants.sku": regex,
                    },
                    {
                        "attributes.material": regex,
                    },
                    {
                        "attributes.pattern": regex,
                    },
                    {
                        "attributes.sleeveLength": regex,
                    },
                    {
                        "attributes.fit": regex,
                    }
                );
            }

            if (matchingProductCategoryIds.length) {
                searchConditions.push({
                    productCategory: {
                        $in: matchingProductCategoryIds,
                    },
                });
            }

            match.$or = searchConditions;
        }

        /*
         * ---------------------------------------------------------
         * GET PRODUCTS
         *
         * IMPORTANT:
         * Do NOT filter using stored fromMinutes/toMinutes here.
         * Your existing data can have fromTime/toTime and stale
         * fromMinutes/toMinutes values.
         * ---------------------------------------------------------
         */

        const [products, total] = await Promise.all([
            ProductModel.find(match)
                .populate({
                    path: "productCategory",
                })
                .populate({
                    path: "category",
                })
                .populate({
                    path: "unit",
                    select: "name shortName symbol unitValue",
                })
                .populate({
                    path: "variants.unit",
                    select: "name shortName symbol unitValue",
                })
                .populate({
                    path: "ribbon",
                })
                .populate({
                    path: "attributes.brand",
                })
                .sort({
                    isFeatured: -1,
                    isTrending: -1,
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limit)
                .lean(),

            ProductModel.countDocuments(match),
        ]);

        /*
         * ---------------------------------------------------------
         * ADD isAvailableNow TO EACH PRODUCT
         * ---------------------------------------------------------
         */

        const productsWithAvailability = products.map((product: any) => ({
            ...product,

            isAvailableNow: isProductAvailableNow(
                product.availability
            ),
        }));

        /*
         * ---------------------------------------------------------
         * RESPONSE
         * ---------------------------------------------------------
         */

        return {
            products: productsWithAvailability,
            total,
        };
    }

    async findRestaurantsByCategory(
        categoryId: string,
        lat: number,
        lng: number,
        maxDistance: number,
        search: string = ""
    ) {
        /*
         * ---------------------------------------------------------
         * FIND NEARBY VENDORS
         * ---------------------------------------------------------
         */

        const nearbyVendors = await VendorProfileModel.find({
            "storeLocationAddress.location": {
                $geoWithin: {
                    $centerSphere: [
                        [lng, lat],
                        maxDistance / 6378100,
                    ],
                },
            },
        })
            .select("user storeName profileImage")
            .lean();

        const vendorIds = nearbyVendors
            .map((v) => v.user)
            .filter(Boolean);

        if (!vendorIds.length) {
            return [];
        }

        /*
         * ---------------------------------------------------------
         * BASE MATCH
         * ---------------------------------------------------------
         */

        const match: any = {
            vendorId: {
                $in: vendorIds,
            },

            category: new mongoose.Types.ObjectId(categoryId),

            isActive: true,

            isMainCatalogProduct: true,
        };

        /*
         * ---------------------------------------------------------
         * SEARCH
         * ---------------------------------------------------------
         */

        if (search?.trim()) {
            match.name = {
                $regex: search.trim(),
                $options: "i",
            };
        }

        /*
         * ---------------------------------------------------------
         * FIND RESTAURANTS
         * ---------------------------------------------------------
         */

        const restaurants = await ProductModel.aggregate([
            {
                $match: match,
            },

            {
                $group: {
                    _id: "$vendorId",

                    totalProducts: {
                        $sum: 1,
                    },

                    products: {
                        $push: {
                            availability: "$availability",
                        },
                    },
                },
            },

            {
                $lookup: {
                    from: "vendorprofiles",
                    localField: "_id",
                    foreignField: "user",
                    as: "vendor",
                },
            },

            {
                $unwind: "$vendor",
            },

            {
                $project: {
                    _id: "$vendor.user",

                    vendorProfileId: "$vendor._id",

                    storeName: "$vendor.storeName",

                    storeSlug: "$vendor.storeSlug",

                    storeLogo: "$vendor.storeLogo",

                    storeImages: "$vendor.storeImages",

                    totalProducts: 1,

                    products: 1,

                    workingHours: "$vendor.workingHours",

                    workingDays: "$vendor.workingDays",

                    isVerified: "$vendor.isVerified",

                    isKycApproved: "$vendor.isKycApproved",

                    profileStatus: "$vendor.profileStatus",

                    isOnHoliday: "$vendor.isOnHoliday",

                    holidayMessage: "$vendor.holidayMessage",

                    address: {
                        city: "$vendor.storeLocationAddress.city",

                        state: "$vendor.storeLocationAddress.state",

                        country:
                            "$vendor.storeLocationAddress.country",
                    },
                },
            },

            {
                $sort: {
                    storeName: 1,
                },
            },
        ]);

        /*
         * ---------------------------------------------------------
         * CALCULATE RESTAURANT AVAILABILITY
         *
         * Restaurant is available when ANY product is currently
         * available.
         * ---------------------------------------------------------
         */

        const restaurantsWithAvailability =
            restaurants.map((restaurant: any) => {
                const isAvailableNow =
                    Array.isArray(restaurant.products) &&
                    restaurant.products.some(
                        (product: any) =>
                            isProductAvailableNow(
                                product.availability
                            )
                    );

                const {
                    products,
                    ...restaurantData
                } = restaurant;

                return {
                    ...restaurantData,

                    isAvailableNow: Boolean(
                        isAvailableNow
                    ),
                };
            });

        return restaurantsWithAvailability;
    }
}