import { CategoryProductsRepository } from "../repositories/categorywiseproducts.repository.js";

export class CategoryProductsService {
    private repo: CategoryProductsRepository;

    constructor() {
        this.repo = new CategoryProductsRepository();
    }

    async getCategoryProducts(
        categoryId: string,
        lat: number,
        lng: number,
        maxDistance: number,
        page: number,
        limit: number,
        search: string,
        vendorId?: string) {
        const skip = (page - 1) * limit;

        const { products, total } =
            await this.repo.findByCategory(
                categoryId,
                lat,
                lng,
                maxDistance,
                skip,
                limit,
                search,
                vendorId
            );

        return {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            products,
        };
    }
}