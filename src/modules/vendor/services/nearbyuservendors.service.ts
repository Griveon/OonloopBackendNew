import { NearbyUserVendorsRepository } from "../repositories/nearbyuservendors.repository.js";

export class NearbyUserVendorsService {
    private repo: NearbyUserVendorsRepository;

    constructor() {
        this.repo = new NearbyUserVendorsRepository();
    }

    async getNearbyVendors(
        longitude: number,
        latitude: number,
        maxDistance?: number,
        page?: number,
        limit?: number
    ) {
        return await this.repo.findNearbyVendors(
            longitude,
            latitude,
            maxDistance,
            page,
            limit
        );
    }
}