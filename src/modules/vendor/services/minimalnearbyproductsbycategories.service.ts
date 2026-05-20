import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { MinimalNearbyProductsByCategoriesRepository } from "../repositories/minimalnearbyproductsbycategories.repository.js";
import mongoose from "mongoose";

export class MinimalNearbyProductsByCategoriesService {

    private repo: MinimalNearbyProductsByCategoriesRepository;

    constructor() {
        this.repo = new MinimalNearbyProductsByCategoriesRepository();
    }

    async getNearbyCategoryWiseProducts(
        lat: number,
        lng: number,
        maxDistance = 10000,
        page = 1,
        limit = 10
    ) {

        const nearbyVendors = await VendorProfileModel.find({
            "storeLocationAddress.location": {
                $geoWithin: {
                    $centerSphere: [
                        [lng, lat],
                        maxDistance / 6378100,
                    ],
                },
            },
        }).select("_id user");

        
        
        const vendorProfileIds = nearbyVendors
            .map((v: any) => v.user)
            .filter(Boolean)
            .map(id => new mongoose.Types.ObjectId(id));

        console.log("Nearby Vendor Profile IDs:", vendorProfileIds);

        if (!vendorProfileIds.length) {
            return [];
        }

        return await this.repo.getCategoryWiseNearbyProducts(
            vendorProfileIds,
            limit
        );
    }
}