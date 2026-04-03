import type { IProductCategory } from "../interfaces/productcategory.interface.js";
import { ProductCategoryModel } from "../models/productcategory.model.js";

export class ProductCategoryRepository {
    async create(data: Partial<IProductCategory>) {
        return await ProductCategoryModel.create(data);
    }

    async findAll() {
        return await ProductCategoryModel.find({ isActive: true });
    }

    async findById(id: string) {
        return await ProductCategoryModel.findById(id);
    }

    async update(id: string, data: Partial<IProductCategory>) {
        return await ProductCategoryModel.findByIdAndUpdate(id, data, {
            new: true,
        });
    }

    async deactivate(id: string) {
        return await ProductCategoryModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }

    async activate(id: string) {
        return await ProductCategoryModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }
}