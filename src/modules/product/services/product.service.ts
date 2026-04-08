import { ProductRepository } from "../repositories/product.repository.js";
import type { IProduct } from "../interfaces/product.interface.js";

export class ProductService {
    private repo: ProductRepository;

    constructor() {
        this.repo = new ProductRepository();
    }

    async create(data: IProduct) {
        return await this.repo.create(data);
    }

    async getById(id: string) {
        const product = await this.repo.findById(id);
        if (!product) throw new Error("Product not found");
        return product;
    }

    async getAll(page = 1, limit = 10, filter: any = {}) {
        return await this.repo.findAll(filter, page, limit);
    }

    async update(id: string, data: Partial<IProduct>) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Product not found");
        return await this.repo.update(id, data);
    }

    async delete(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Product not found");
        return await this.repo.delete(id);
    }
}