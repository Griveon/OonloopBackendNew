// currency.repository.ts
import { CurrencyModel } from "../models/currency.model.js";
import type { ICurrency } from "../interfaces/currency.interface.js";

export class CurrencyRepository {

    async createCurrency(data: Partial<ICurrency>) {
        return await CurrencyModel.create(data);
    }

    async findByCode(code: string) {
        return await CurrencyModel.findOne({ code: code.toUpperCase() });
    }

    async findById(id: string) {
        return await CurrencyModel.findById(id);
    }

    async findAll() {
        return await CurrencyModel.find({ isActive: true });
    }

    async findAllQuery(page: number, limit: number, search = "") {
        const skip = (page - 1) * limit;

        const filter = {
            isActive: true,
            $or: [
                { code: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } },
                { symbol: { $regex: search, $options: "i" } }
            ]
        };

        const [currencies, total] = await Promise.all([
            CurrencyModel.find(filter).skip(skip).limit(limit),
            CurrencyModel.countDocuments(filter)
        ]);

        return { currencies, total };
    }

    async updateCurrency(id: string, data: Partial<ICurrency>) {
        return await CurrencyModel.findByIdAndUpdate(id, data, { new: true });
    }

    async deactivateCurrency(id: string) {
        return await CurrencyModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
    }

    async activateCurrency(id: string) {
        return await CurrencyModel.findByIdAndUpdate(id, { isActive: true }, { new: true });
    }
}