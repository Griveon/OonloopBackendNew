import { RibbonModel } from "../models/ribbon.model.js";
import type { IRibbon } from "../interfaces/ribbon.interface.js";

export class RibbonRepository {
    async create(data: Partial<IRibbon>) {
        return await RibbonModel.create(data);
    }

    async findAll() {
        return await RibbonModel.find({ isActive: true }).sort({
            priority: -1,
        });
    }

    async createBulk(data: Partial<IRibbon>[]) {
        return await RibbonModel.insertMany(data);
    }

    async findById(id: string) {
        return await RibbonModel.findById(id);
    }

    async update(id: string, data: Partial<IRibbon>) {
        return await RibbonModel.findByIdAndUpdate(id, data, {
            new: true,
        });
    }

    async deactivate(id: string) {
        return await RibbonModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }

    async activate(id: string) {
        return await RibbonModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }
}