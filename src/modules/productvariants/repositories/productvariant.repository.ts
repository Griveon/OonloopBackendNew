import { ProductVariantModel } from "../models/productvariant.model.js";
import type { IProductVariant } from "../interfaces/productvariant.interface.js";

export class ProductVariantRepository {
    async create(data: Partial<IProductVariant>) {
        return await ProductVariantModel.create(data);
    }

    // productVariant.repo.ts
    async createBulk(data: Partial<IProductVariant>[]) {
        return await ProductVariantModel.insertMany(data, { ordered: false });
    }

    async findAll() {
        return await ProductVariantModel.find({ isActive: true }).sort({
            createdAt: -1,
        });
    }

    async findById(id: string) {
        return await ProductVariantModel.findById(id);
    }

    async update(id: string, data: Partial<IProductVariant>) {
        return await ProductVariantModel.findByIdAndUpdate(id, data, {
            new: true,
        });
    }

    async deactivate(id: string) {
        return await ProductVariantModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }

    async activate(id: string) {
        return await ProductVariantModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }
}