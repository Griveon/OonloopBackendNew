import { VendorCategoryModel } from "../models/vendorcategory.model.js";
import type { IVendorCategory } from "../interfaces/vendorcategory.interface.js";
import { ProductModel } from "../../product/models/product.model.js";

export class VendorCategoryRepository {
    async create(data: Partial<IVendorCategory>) {
        return await VendorCategoryModel.create(data);
    }

    async createBulk(data: Partial<IVendorCategory>[]) {
        return await VendorCategoryModel.insertMany(data);
    }

    async findAll(role?: string) {

        if (role === "vendor") {
            return await VendorCategoryModel.find({
                isActive: true,
            })
                .sort({ name: 1 })
                .lean();
        }

        const categoryIds = await ProductModel.distinct("category", {
            isActive: true,
        });

        return await VendorCategoryModel.find({
            _id: {
                $in: categoryIds,
            },
            isActive: true,
        })
            .sort({ name: 1 })
            .lean();
    }

    async findById(id: string) {
        return await VendorCategoryModel.findById(id);
    }

    async update(id: string, data: Partial<IVendorCategory>) {
        return await VendorCategoryModel.findByIdAndUpdate(id, data, {
            new: true,
        });
    }

    async deactivate(id: string) {
        return await VendorCategoryModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }

    async activate(id: string) {
        return await VendorCategoryModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }
}