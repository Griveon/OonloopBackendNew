import { NearbyVendorProductsRepository } from "../repositories/nearbyvendorproducts.repository.js";

export class NearbyVendorProductsService {
    private repo: NearbyVendorProductsRepository;

    constructor() {
        this.repo = new NearbyVendorProductsRepository();
    }

    async getNearbyVendorProducts(
        longitude: number,
        latitude: number,
        maxDistance?: number,
        page?: number,
        limit?: number
    ) {
        return await this.repo.findNearbyVendorProducts(
            longitude,
            latitude,
            maxDistance,
            page,
            limit
        );
    }
}