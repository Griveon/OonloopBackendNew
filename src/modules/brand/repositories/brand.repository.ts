import { BrandModel } from "../models/brand.model.js";
import type { IBrand } from "../interfaces/brand.interface.js";

export class BrandRepository {
    async create(data: Partial<IBrand>) {
        return await BrandModel.create(data);
    }

    async findAll({
        page = 1,
        limit = 10,
        search = "",
    }: {
        page: number;
        limit: number;
        search?: string;
    }) {
        const skip = (page - 1) * limit;

        const query: any = {
            isActive: true,
        };

        if (search) {
            query.name = { $regex: search, $options: "i" }; // adjust field if needed
        }

        const [brands, total] = await Promise.all([
            BrandModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            BrandModel.countDocuments(query),
        ]);

        return { brands, total };
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