import { ProductCategoryRepository } from "../repositories/productcategory.repository.js";

export class ProductCategoryService {
    private repo: ProductCategoryRepository;

    constructor() {
        this.repo = new ProductCategoryRepository();
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

    async delete(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Category not found");

        return await this.repo.deactivate(id);
    }

    async activate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Category not found");

        return await this.repo.activate(id);
    }

    async deactivate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Category not found");

        return await this.repo.deactivate(id);
    }
}