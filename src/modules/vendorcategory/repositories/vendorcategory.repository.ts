import { VendorCategoryModel } from "../models/vendorcategory.model.js";
import type { IVendorCategory } from "../interfaces/vendorcategory.interface.js";

export class VendorCategoryRepository {
    async create(data: Partial<IVendorCategory>) {
        return await VendorCategoryModel.create(data);
    }
    
    async createBulk(data: Partial<IVendorCategory>[]) {
        return await VendorCategoryModel.insertMany(data);
    }

    async findAll() {
        return await VendorCategoryModel.find({ isActive: true }).sort({ name: 1 });
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