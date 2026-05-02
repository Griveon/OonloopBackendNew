import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { ProductModel } from "../../product/models/product.model.js";

export class NearbyVendorProductsRepository {
    async findNearbyVendorProducts(
        longitude: number,
        latitude: number,
        maxDistance: number = 10000,
        page: number = 1,
        limit: number = 10
    ) {
        const skip = (page - 1) * limit;

        // Find nearby vendors
        const nearbyVendors = await VendorProfileModel.find({
            "storeLocationAddress.location": {
                $geoWithin: {
                    $centerSphere: [
                        [longitude, latitude],
                        maxDistance / 6378100,
                    ],
                },
            },
        }).select("_id user");

        const vendorIds = nearbyVendors.map((vendor) => vendor.user);

        console.log("Nearby Vendor IDs:", vendorIds);

        const products = await ProductModel.find({
            vendorId: { $in: vendorIds },
        })
            .skip(skip)
            .limit(limit)
            .populate("vendorId", "storeName businessType");

        return products;
    }
}