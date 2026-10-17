import type { IProductCategory } from "../interfaces/productcategory.interface.js";
import { ProductCategoryModel } from "../models/productcategory.model.js";
import { appCache } from "../../../utils/cache.util.js";

export class ProductCategoryRepository {
    async create(data: Partial<IProductCategory>) {
        const result = await ProductCategoryModel.create(data);
        appCache.deletePrefix("product_cat_");
        return result;
    }

    async createBulk(data: Partial<IProductCategory>[]) {
        const result = await ProductCategoryModel.insertMany(data, { ordered: false });
        appCache.deletePrefix("product_cat_");
        return result;
    }

    async findAll() {
        const cacheKey = "product_cat_all";
        const cached = appCache.get<any[]>(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        const items = await ProductCategoryModel.find({ isActive: true }).lean();
        appCache.set(cacheKey, items, 60);
        return items;
    }

    async findById(id: string) {
        return await ProductCategoryModel.findById(id).lean();
    }

    async update(id: string, data: Partial<IProductCategory>) {
        const result = await ProductCategoryModel.findByIdAndUpdate(id, data, {
            new: true,
        });
        appCache.deletePrefix("product_cat_");
        return result;
    }

    async deactivate(id: string) {
        const result = await ProductCategoryModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
        appCache.deletePrefix("product_cat_");
        return result;
    }

    async activate(id: string) {
        const result = await ProductCategoryModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
        appCache.deletePrefix("product_cat_");
        return result;
    }

    async findByVendorCategory(vendorCategoryId: string) {
        const cacheKey = `product_cat_vc_${vendorCategoryId}`;
        const cached = appCache.get<any[]>(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        const items = await ProductCategoryModel.find({
            vendorCategory: vendorCategoryId,
            isActive: true,
        }).lean();

        appCache.set(cacheKey, items, 60);
        return items;
    }
}