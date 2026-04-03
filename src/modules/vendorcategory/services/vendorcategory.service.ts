import { VendorCategoryRepository } from "../repositories/vendorcategory.repository.js";

export class VendorCategoryService {
    private repo: VendorCategoryRepository;

    constructor() {
        this.repo = new VendorCategoryRepository();
    }

    async create(data: any) {
        return await this.repo.create(data);
    }

    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Category not found");
        return item;
    }

    async update(id: string, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Category not found");

        return await this.repo.update(id, data);
    }

    async deactivate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Category not found");

        return await this.repo.deactivate(id);
    }

    async activate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Category not found");

        return await this.repo.activate(id);
    }
}