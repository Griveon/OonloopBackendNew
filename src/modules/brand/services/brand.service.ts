import { BrandRepository } from "../repositories/brand.repository.js";

export class BrandService {
    private repo: BrandRepository;

    constructor() {
        this.repo = new BrandRepository();
    }

    async create(data: any) {
        console.log("Creating brand with data:", data);
        data.vendorId = data.vendorId || data.createdBy;
        return await this.repo.create(data);
    }

    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Brand not found");
        return item;
    }

    async update(id: string, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Brand not found");

        return await this.repo.update(id, data);
    }

    async deactivate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Brand not found");

        return await this.repo.deactivate(id);
    }

    async activate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Brand not found");

        return await this.repo.activate(id);
    }
}