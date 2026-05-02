import type { IGSTRule } from "../interfaces/gstrule.interface.js";
import { GSTRuleRepository } from "../repositories/gstrule.repository.js";

export class GSTRuleService {
    private repo: GSTRuleRepository;

    constructor() {
        this.repo = new GSTRuleRepository();
    }

    async create(data: any) {
        const existing = await this.repo.findByHSN(data.hsnCode);
        if (existing) throw new Error("HSN code already exists");

        return await this.repo.create(data);
    }

    async createBulk(data: Partial<IGSTRule>[]) {
        if (!data.length) {
            throw new Error("Empty payload");
        }

        return await this.repo.createBulk(data);
    }
    
    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("GST Rule not found");
        return item;
    }

    async update(id: string, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("GST Rule not found");

        return await this.repo.update(id, data);
    }

    async deactivate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("GST Rule not found");

        return await this.repo.deactivate(id);
    }

    async activate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("GST Rule not found");

        return await this.repo.activate(id);
    }
}