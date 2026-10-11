import { VendorCategoryRepository } from "../repositories/vendorcategory.repository.js";
import mongoose from "mongoose";

export class VendorCategoryService {
    private repo: VendorCategoryRepository;

    constructor() {
        this.repo = new VendorCategoryRepository();
    }

    async create(data: any) {
        const { clickCount: _ignored, ...safeData } = data || {};
        return await this.repo.create(safeData);
    }

    async createBulk(data: any[]) {
        return await this.repo.createBulk(
            data.map(({ clickCount: _ignored, ...category }) => category)
        );
    }

    async getAll(role: any) {
        const categories = await this.repo.findAll(role);
        if (role === "vendor") return categories;

        return categories.map((category: any, index: number) => ({
            ...category,
            clickCount: Number(category.clickCount ?? 0),
            rank: index + 1,
        }));
    }

    async recordClick(id: string) {
        if (!mongoose.isValidObjectId(id)) {
            throw new Error("Invalid category ID");
        }

        const category = await this.repo.incrementClick(id);
        if (!category) throw new Error("Category not found or inactive");

        return { categoryId: category._id.toString() };
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Category not found");
        return item;
    }

    async update(id: string, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Category not found");

        const { clickCount: _ignored, ...safeData } = data || {};
        return await this.repo.update(id, safeData);
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
