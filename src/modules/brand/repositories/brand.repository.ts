import { BrandModel } from "../models/brand.model.js";
import type { IBrand } from "../interfaces/brand.interface.js";

export class BrandRepository {
    async create(data: Partial<IBrand>) {
        return await BrandModel.create(data);
    }

    async findAll() {
        return await BrandModel.find({
            isActive: true,
        }).sort({ createdAt: -1 });
    }

    async findById(id: string) {
        return await BrandModel.findById(id);
    }

    async update(id: string, data: Partial<IBrand>) {
        return await BrandModel.findByIdAndUpdate(id, data, {
            new: true,
        });
    }

    async deactivate(id: string) {
        return await BrandModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }

    async activate(id: string) {
        return await BrandModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }
}