import { GSTRuleModel } from "../models/gstrule.model.js";
import type { IGSTRule } from "../interfaces/gstrule.interface.js";

export class GSTRuleRepository {
    async create(data: Partial<IGSTRule>) {
        return await GSTRuleModel.create(data);
    }

    async findAll() {
        return await GSTRuleModel.find().sort({ hsnCode: 1 });
    }

    async findById(id: string) {
        return await GSTRuleModel.findById(id);
    }

    async findByHSN(hsnCode: string) {
        return await GSTRuleModel.findOne({ hsnCode });
    }

    async update(id: string, data: Partial<IGSTRule>) {
        return await GSTRuleModel.findByIdAndUpdate(id, data, { new: true });
    }

    async deactivate(id: string) {
        return await GSTRuleModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }

    async activate(id: string) {
        return await GSTRuleModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }
}