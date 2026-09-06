import { ProductCategoryModel } from "../../productcategories/models/productcategory.model.js";
import { isProductAvailableNow } from "../../vendor/utils/timetominutes.util.js";
import { VendorCategoryModel } from "../../vendorcategory/models/vendorcategory.model.js";
import { ProductModel } from "../models/product.model.js";
import { normalizeSearch, getSearchTerms, escapeRegex } from "../utils/productsearch.util.js";

export class ProductSearchRepository {

    async SearchProducts(
        keyword: string,
        page: number,
        limit: number
    ) {
        page = Math.max(Number(page) || 1, 1);

        limit = Math.min(
            Math.max(Number(limit) || 20, 1),
            100
        );

        const normalizedKeyword = normalizeSearch(keyword);

        if (!normalizedKeyword) {
            return {
                products: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
            };
        }

        const skip = (page - 1) * limit;

        const searchTerms = getSearchTerms(
            normalizedKeyword
        );

        console.log(searchTerms);

        const regexTerms = searchTerms.map(
            (term) =>
                new RegExp(
                    escapeRegex(term),
                    "i"
                )
        );
        console.log(regexTerms);

        const categoryRegex = regexTerms;

        const [
            vendorCategories,
            productCategories,
        ] = await Promise.all([
            VendorCategoryModel.find({
                isActive: true,
                $or: categoryRegex.flatMap(
                    (regex) => [
                        {
                            name: regex,
                        },
                    ]
                ),
            })
                .select("_id")
                .lean(),

            ProductCategoryModel.find({
                isActive: true,
                $or: categoryRegex.flatMap(
                    (regex) => [
                        {
                            "l1Category.name": regex,
                        },
                        {
                            "l2Category.name": regex,
                        },
                        {
                            "l3Category.name": regex,
                        },
                        {
                            "l4Category.name": regex,
                        },
                    ]
                ),
            })
                .select("_id vendorCategory")
                .lean(),
        ]);

        const vendorCategoryIds =
            vendorCategories.map(
                (category) => category._id
            );


        const productCategoryIds =
            productCategories.map(
                (category) => category._id
            );

        const productConditions: any[] = [];


        for (const regex of regexTerms) {
            productConditions.push({
                name: regex,
            });

            productConditions.push({
                description: regex,
            });

            productConditions.push({
                slug: regex,
            });

            productConditions.push({
                searchKeywords: regex,
            });

            productConditions.push({
                "variants.sku": regex,
            });

            productConditions.push({
                "attributes.material": regex,
            });

            productConditions.push({
                "attributes.pattern": regex,
            });

            productConditions.push({
                "attributes.sleeveLength": regex,
            });

            productConditions.push({
                "attributes.fit": regex,
            });
        }

        if (vendorCategoryIds.length > 0) {
            productConditions.push({
                category: {
                    $in: vendorCategoryIds,
                },
            });
        }

        if (productCategoryIds.length > 0) {
            productConditions.push({
                productCategory: {
                    $in: productCategoryIds,
                },
            });
        }

        const query: any = {
            isActive: true,
            $or: productConditions,
        };

        const [products, total] =
            await Promise.all([
                ProductModel.find(query)
                    .populate("productCategory")
                    .populate("category")
                    .populate("unit")
                    .populate({
                        path: "attributes.brand",
                    })
                    .populate({
                        path: "variants.unit",
                        select:
                            "name shortName symbol unitValue",
                    })
                    .lean(),

                ProductModel.countDocuments(query),
            ]);

        /*
         * ---------------------------------------------------------
         * ADD isAvailableNow TO EACH PRODUCT
         * ---------------------------------------------------------
         */

        const productsWithAvailability = products.map(
            (product: any) => ({
                ...product,

                isAvailableNow: isProductAvailableNow(
                    product.availability
                ),
            })
        );

        const search = normalizedKeyword;


        productsWithAvailability.sort((a: any, b: any) => {
            const aName =
                String(a.name || "").toLowerCase();

            const bName =
                String(b.name || "").toLowerCase();


            let aScore = 0;
            let bScore = 0;

            if (aName === search) {
                aScore += 100;
            }

            if (bName === search) {
                bScore += 100;
            }

            if (aName.startsWith(search)) {
                aScore += 50;
            }

            if (bName.startsWith(search)) {
                bScore += 50;
            }

            if (aName.includes(search)) {
                aScore += 30;
            }

            if (bName.includes(search)) {
                bScore += 30;
            }

            const aKeywords =
                (a.searchKeywords || [])
                    .join(" ")
                    .toLowerCase();

            const bKeywords =
                (b.searchKeywords || [])
                    .join(" ")
                    .toLowerCase();


            if (aKeywords.includes(search)) {
                aScore += 25;
            }

            if (bKeywords.includes(search)) {
                bScore += 25;
            }

            if (a.isFeatured) {
                aScore += 5;
            }

            if (b.isFeatured) {
                bScore += 5;
            }

            if (a.isTrending) {
                aScore += 3;
            }

            if (b.isTrending) {
                bScore += 3;
            }


            return bScore - aScore;
        });

        const paginatedProducts =
            productsWithAvailability.slice(
                skip,
                skip + limit
            );


        return {
            products: paginatedProducts,

            total,

            page,

            limit,

            totalPages: Math.ceil(
                total / limit
            ),

            search: normalizedKeyword,
        };
    }

}