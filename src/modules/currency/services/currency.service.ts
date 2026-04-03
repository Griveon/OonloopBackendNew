// currency.service.ts
import type { ICurrency } from "../interfaces/currency.interface.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";

export class CurrencyService {
    private currencyRepository: CurrencyRepository;

    constructor() {
        this.currencyRepository = new CurrencyRepository();
    }

    async createCurrency(data: ICurrency) {
        const existing = await this.currencyRepository.findByCode(data.code);
        if (existing) throw new Error(`Currency with code "${data.code}" already exists`);
        return await this.currencyRepository.createCurrency(data);
    }

    async getAllCurrencies() {
        return await this.currencyRepository.findAll();
    }

    async getAllCurrenciesWithQuery(page = 1, limit = 10, search = "") {
        return await this.currencyRepository.findAllQuery(page, limit, search);
    }

    async getCurrencyById(id: string) {
        const currency = await this.currencyRepository.findById(id);
        if (!currency) throw new Error("Currency not found");
        return currency;
    }

    async updateCurrency(id: string, data: Partial<ICurrency>) {
        const currency = await this.currencyRepository.findById(id);
        if (!currency) throw new Error("Currency not found");

        if (data.code) {
            const existing = await this.currencyRepository.findByCode(data.code);
            if (existing && existing._id.toString() !== id) {
                throw new Error(`Currency with code "${data.code}" already exists`);
            }
        }

        return await this.currencyRepository.updateCurrency(id, data);
    }

    async deactivateCurrency(id: string) {
        const currency = await this.currencyRepository.findById(id);
        if (!currency) throw new Error("Currency not found");
        return await this.currencyRepository.deactivateCurrency(id);
    }

    async activateCurrency(id: string) {
        const currency = await this.currencyRepository.findById(id);
        if (!currency) throw new Error("Currency not found");
        return await this.currencyRepository.activateCurrency(id);
    }
}