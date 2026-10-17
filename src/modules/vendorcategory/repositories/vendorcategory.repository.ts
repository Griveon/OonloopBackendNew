import { VendorCategoryModel } from "../models/vendorcategory.model.js";
import type { IVendorCategory } from "../interfaces/vendorcategory.interface.js";
import { ProductModel } from "../../product/models/product.model.js";
import { appCache } from "../../../utils/cache.util.js";

export class VendorCategoryRepository {
    async create(data: Partial<IVendorCategory>) {
        const result = await VendorCategoryModel.create(data);
        appCache.deletePrefix("vendor_cat_");
        appCache.deletePrefix("cat_handling_");
        return result;
    }

    async createBulk(data: Partial<IVendorCategory>[]) {
        const result = await VendorCategoryModel.insertMany(data);
        appCache.deletePrefix("vendor_cat_");
        appCache.deletePrefix("cat_handling_");
        return result;
    }

    async findAll(role?: string) {
        const cacheKey = `vendor_cat_all_${role || "public"}`;
        const cached = appCache.get<any[]>(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        let result: any[];
        if (role === "vendor") {
            result = await VendorCategoryModel.find({
                isActive: true,
            })
                .sort({ name: 1 })
                .lean();
        } else {
            const categoryIds = await ProductModel.distinct("category", {
                isActive: true,
            });

            result = await VendorCategoryModel.find({
                _id: {
                    $in: categoryIds,
                },
                isActive: true,
            })
                .sort({ clickCount: -1, _id: 1 })
                .lean();
        }

        appCache.set(cacheKey, result, 60);
        return result;
    }

    async findById(id: string) {
        return await VendorCategoryModel.findById(id).lean();
    }

    async incrementClick(id: string) {
        appCache.deletePrefix("vendor_cat_all_public");
        return await VendorCategoryModel.findOneAndUpdate(
            { _id: id, isActive: true },
            { $inc: { clickCount: 1 } },
            { new: true, projection: { _id: 1 } }
        );
    }

    async update(id: string, data: Partial<IVendorCategory>) {
        const result = await VendorCategoryModel.findByIdAndUpdate(id, data, {
            new: true,
        });
        appCache.deletePrefix("vendor_cat_");
        appCache.deletePrefix("cat_handling_");
        return result;
    }

    async deactivate(id: string) {
        const result = await VendorCategoryModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
        appCache.deletePrefix("vendor_cat_");
        appCache.deletePrefix("cat_handling_");
        return result;
    }

    async activate(id: string) {
        const result = await VendorCategoryModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
        appCache.deletePrefix("vendor_cat_");
        appCache.deletePrefix("cat_handling_");
        return result;
    }
}
