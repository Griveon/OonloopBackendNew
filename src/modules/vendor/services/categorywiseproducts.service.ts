import mongoose from "mongoose";

import { CategoryProductsRepository } from
    "../repositories/categorywiseproducts.repository.js";

import { ProductModel } from
    "../../product/models/product.model.js";

export class CategoryProductsService {
    private repo: CategoryProductsRepository;

    constructor() {
        this.repo = new CategoryProductsRepository();
    }

    async getSubCategories(categoryId: string) {
        const subCategories =
            await this.repo.findSubCategories(categoryId);

        /*
         * Build product filter.
         *
         * Product.category        = VendorCategory
         * Product.productCategory = Subcategory
         */
        const productFilter: Record<string, any> = {
            isActive: true,
            productCategory: {
                $ne: null,
            },
        };

        if (
            categoryId &&
            categoryId !== "all" &&
            mongoose.Types.ObjectId.isValid(categoryId)
        ) {
            productFilter.category =
                new mongoose.Types.ObjectId(categoryId);
        }

        /*
         * Get subcategory IDs having at least one active product.
         */
        const availableSubCategoryIds =
            await ProductModel.distinct(
                "productCategory",
                productFilter
            );

        const availableSubCategoryIdSet = new Set(
            availableSubCategoryIds.map((id) =>
                String(id)
            )
        );

        /*
         * Remove subcategories having no active products.
         */
        const mappedSubCategories = subCategories
            .filter((cat: any) =>
                availableSubCategoryIdSet.has(
                    String(cat._id)
                )
            )
            .map((cat: any) => {
                const label =
                    cat?.l4Category?.name ||
                    cat?.l3Category?.name ||
                    cat?.l2Category?.name ||
                    cat?.l1Category?.name ||
                    "Sub Category";

                return {
                    id: cat._id,
                    label,
                    icon: cat.icon || "",
                    vendorCategory:
                        cat.vendorCategory,
                    l1Category: cat.l1Category,
                    l2Category: cat.l2Category,
                    l3Category: cat.l3Category,
                    l4Category: cat.l4Category,
                };
            });

        /*
         * When no subcategory has products,
         * return an empty list so frontend does not show
         * the subcategory section.
         */
        if (mappedSubCategories.length === 0) {
            return [];
        }

        return [
            {
                id: "all",
                label: "All",
                icon: "apps",
            },
            ...mappedSubCategories,
        ];
    }

    async getCategoryProducts(
        categoryId: string,
        productCategoryId: string,
        lat: number,
        lng: number,
        maxDistance: number,
        page: number,
        limit: number,
        search: string,
        vendorId?: string,
        l2CategoryId?: string,
        l2CategoryName?: string
    ) {
        const safePage =
            Number(page) > 0
                ? Number(page)
                : 1;

        const safeLimit =
            Number(limit) > 0
                ? Number(limit)
                : 10;

        const skip =
            (safePage - 1) * safeLimit;

        const { products, total } =
            await this.repo.findByCategory(
                categoryId,
                productCategoryId,
                lat,
                lng,
                maxDistance,
                skip,
                safeLimit,
                search,
                vendorId,
                l2CategoryId,
                l2CategoryName
            );

        return {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages:
                Math.ceil(total / safeLimit),
            products,
        };
    }

    async getRestaurants(
        categoryId: string,
        lat: number,
        lng: number,
        maxDistance: number,
        search: string
    ) {
        return this.repo.findRestaurantsByCategory(
            categoryId,
            lat,
            lng,
            maxDistance,
            search
        );
    }
}