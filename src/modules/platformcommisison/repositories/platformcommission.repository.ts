import { PlatformCommissionModel } from "../models/platformcommission.model.js";
import type { IPlatformCommission } from "../interfaces/platformcommission.interface.js";

export class PlatformCommissionRepository {

    async create(data: Partial<IPlatformCommission>) {
        return await PlatformCommissionModel.create(data);
    }

    async findAll() {
        return await PlatformCommissionModel.find().sort({ createdAt: -1 });
    }

    async findById(id: string) {
        return await PlatformCommissionModel.findById(id);
    }

    async findActive(storeId?: string) {
        return await PlatformCommissionModel.findOne({
            storeId,
            isActive: true,
        });
    }

    async update(id: string, data: Partial<IPlatformCommission>) {
        return await PlatformCommissionModel.findByIdAndUpdate(
            id,
            data,
            { new: true }
        );
    }

    async deactivate(id: string) {
        return await PlatformCommissionModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }
}