import mongoose from "mongoose";
import { ProductModel } from "../../product/models/product.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { ProductCategoryModel } from "../../productcategories/models/productcategory.model.js";
import {
    escapeRegex,
    normalizeSearch,
    getSearchTerms,
} from "../../product/utils/productsearch.util.js";
import { VendorCategoryModel } from "../../vendorcategory/models/vendorcategory.model.js";
import { isProductAvailableNow } from "../utils/timetominutes.util.js";

export class CategoryProductsRepository {
    async findSubCategories(categoryId: string) {
        const match: any = {
            isActive: true,
        };

        if (
            categoryId &&
            (categoryId === "restaurant" || categoryId === "restaurants")
        ) {
            const restCat = await VendorCategoryModel.findOne({
                name: { $regex: /restaurant/i },
                isActive: true,
            }).select("_id").lean();

            if (restCat) {
                match.vendorCategory = restCat._id;
            }
        } else if (categoryId && categoryId !== "all" && mongoose.Types.ObjectId.isValid(categoryId)) {
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
            customerSellingPrice: product.customerSellingPrice ?? product.price,
            variants: Array.isArray(product.variants)
                ? product.variants.map((v: any) => ({
                    ...v,
                    customerSellingPrice: v.customerSellingPrice ?? v.price,
                }))
                : product.variants,

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
        categoryId?: string,
        lat?: number,
        lng?: number,
        maxDistance: number = 10000,
        search: string = "",
        page: number = 1,
        limit: number = 12
    ) {
        /*
         * ---------------------------------------------------------
         * FIND NEARBY VENDORS
         * ---------------------------------------------------------
         */

        const geoFilter: any = {};
        if (lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
            geoFilter["storeLocationAddress.location"] = {
                $geoWithin: {
                    $centerSphere: [
                        [Number(lng), Number(lat)],
                        (Number(maxDistance) || 10000) / 6378100,
                    ],
                },
            };
        }

        const nearbyVendors = await VendorProfileModel.find(geoFilter)
            .select("user storeName profileImage")
            .lean();

        const vendorIds = nearbyVendors
            .map((v) => v.user)
            .filter(Boolean);

        if (!vendorIds.length) {
            return {
                restaurants: [],
                total: 0,
                page: Math.max(Number(page) || 1, 1),
                limit: Math.min(Math.max(Number(limit) || 12, 1), 100),
                totalPages: 0,
                categories: [],
            };
        }

        /*
         * ---------------------------------------------------------
         * DISCOVER RESTAURANT CATEGORIES
         * ---------------------------------------------------------
         */

        const restCat = await VendorCategoryModel.findOne({
            name: { $regex: /restaurant/i },
            isActive: true,
        }).select("_id").lean();

        let allCategoryNames: string[] = [];
        let allCategoryObjects: any[] = [];

        if (restCat) {
            const allProdCats = await ProductCategoryModel.find({
                vendorCategory: restCat._id,
                isActive: true,
            })
                .select("_id l2Category icon")
                .lean();

            const categoryMap = new Map<string, any>();
            for (const pc of allProdCats) {
                const name = pc.l2Category?.name;
                if (name && !categoryMap.has(name)) {
                    categoryMap.set(name, {
                        _id: pc._id,
                        name: name,
                        code: pc.l2Category?.code,
                        icon: pc.icon || "",
                    });
                }
            }
            allCategoryNames = Array.from(categoryMap.keys());
            allCategoryObjects = Array.from(categoryMap.values());
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
            isMainCatalogProduct: true,
        };

        const isAllCategory =
            !categoryId ||
            categoryId === "all" ||
            categoryId === "restaurant" ||
            categoryId === "restaurants" ||
            (restCat && String(categoryId) === String(restCat._id));

        if (!isAllCategory) {
            if (mongoose.Types.ObjectId.isValid(categoryId)) {
                const objId = new mongoose.Types.ObjectId(categoryId);
                const pcDoc = await ProductCategoryModel.findById(objId)
                    .select("l2Category")
                    .lean();

                if (pcDoc?.l2Category?.name) {
                    const sameL2Cats = await ProductCategoryModel.find({
                        ...(restCat ? { vendorCategory: restCat._id } : {}),
                        "l2Category.name": pcDoc.l2Category.name,
                        isActive: true,
                    }).select("_id").lean();

                    match.productCategory = { $in: sameL2Cats.map((c) => c._id) };
                } else {
                    match.$or = [{ category: objId }, { productCategory: objId }];
                }
            } else {
                const matchingProdCats = await ProductCategoryModel.find({
                    ...(restCat ? { vendorCategory: restCat._id } : {}),
                    $or: [
                        { "l2Category.name": { $regex: new RegExp(`^${escapeRegex(categoryId)}$`, "i") } },
                        { "l3Category.name": { $regex: new RegExp(`^${escapeRegex(categoryId)}$`, "i") } },
                        { name: { $regex: new RegExp(`^${escapeRegex(categoryId)}$`, "i") } },
                    ],
                    isActive: true,
                }).select("_id").lean();

                if (matchingProdCats.length > 0) {
                    match.productCategory = { $in: matchingProdCats.map((c) => c._id) };
                } else {
                    match.name = { $regex: categoryId, $options: "i" };
                }
            }
        } else if (restCat) {
            match.category = restCat._id;
        }

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
                            productCategory: "$productCategory",
                        },
                    },

                    productCategoryIds: {
                        $addToSet: "$productCategory",
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
                $lookup: {
                    from: "productcategories",
                    localField: "productCategoryIds",
                    foreignField: "_id",
                    as: "categoryDocs",
                },
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

                    categoryDocs: 1,

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
         * CALCULATE RESTAURANT AVAILABILITY & PRODUCT CATEGORIES
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

                const categories = Array.from(
                    new Set(
                        (restaurant.categoryDocs || [])
                            .map((cd: any) => cd.l2Category?.name || cd.l3Category?.name || cd.name)
                            .filter(Boolean)
                    )
                );

                const categoryList = (restaurant.categoryDocs || []).map((cd: any) => ({
                    _id: cd._id,
                    name: cd.name,
                    l1Category: cd.l1Category,
                    l2Category: cd.l2Category,
                    l3Category: cd.l3Category,
                }));

                const {
                    products,
                    categoryDocs,
                    ...restaurantData
                } = restaurant;

                return {
                    ...restaurantData,
                    categories,
                    cuisines: categories,
                    cuisine: categories.join(", "),
                    categoryList,
                    isAvailableNow: Boolean(
                        isAvailableNow
                    ),
                };
            });

        const total = restaurantsWithAvailability.length;
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
        const startIndex = (safePage - 1) * safeLimit;
        const paginatedRestaurants = restaurantsWithAvailability.slice(
            startIndex,
            startIndex + safeLimit
        );

        const combinedCategoryNames = Array.from(
            new Set([
                ...allCategoryNames,
                ...restaurantsWithAvailability.flatMap((r: any) => r.categories || []),
            ])
        );

        return {
            restaurants: paginatedRestaurants,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit) || (total > 0 ? 1 : 0),
            categories: combinedCategoryNames,
            categoryList: allCategoryObjects,
        };
    }
}