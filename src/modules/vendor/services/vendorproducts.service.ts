import { VendorProductsRepository } from "../repositories/vendorproducts.repository.js";

export class VendorProductsService {
    private repo: VendorProductsRepository;

    constructor() {
        this.repo = new VendorProductsRepository();
    }

    async getVendorWithProducts(
        vendorId: any,
        page?: number,
        limit?: number,
        search?: string,
        category?: string,
        minPrice?: number,
        maxPrice?: number,
        inStock?: boolean
    ) {
        return await this.repo.findVendorWithProducts(
            vendorId,
            page,
            limit,
            search,
            category,
            minPrice,
            maxPrice,
            inStock
        );
    }
}