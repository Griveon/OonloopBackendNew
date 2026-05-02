import { UnitModel } from "../models/unit.model.js";
import type { IUnitDocument } from "../interfaces/unit.interface.js";

export class UnitRepository {

    async create(data: Partial<IUnitDocument>) {
        return await UnitModel.create(data);
    }

    async createBulk(data: Partial<IUnitDocument>[]) {
        return await UnitModel.insertMany(data);
    }

    async findById(id: string) {
        return await UnitModel.findById(id);
    }

    async findAll(filter: any = {}) {
        return await UnitModel.find(filter).sort({ createdAt: -1 });
    }

    async update(id: string, data: Partial<IUnitDocument>) {
        return await UnitModel.findByIdAndUpdate(id, data, { new: true });
    }

    async delete(id: string) {
        return await UnitModel.findByIdAndDelete(id);
    }

    async activate(id: string) {
        return await UnitModel.findByIdAndUpdate(id, { isActive: true }, { new: true });
    }

    async deactivate(id: string) {
        return await UnitModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
    }

}