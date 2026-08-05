import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";

export class NearbyUserVendorsRepository {
    async findNearbyVendors(
        longitude: number,
        latitude: number,
        maxDistance: number = 10000,
        page: number = 1,
        limit: number = 10
    ) {
        const skip = (page - 1) * limit;

        const findQuery = {
            "storeLocationAddress.location": {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistance,
                },
            },
            // profileStatus: "approved",
            // isVerified: true,
        };

        const countQuery:any = {
            "storeLocationAddress.location": {
                $geoWithin: {
                    $centerSphere: [
                        [longitude, latitude],
                        maxDistance / 6378100, // meters to radians
                    ],
                },
            },
            profileStatus: "approved",
            isVerified: true,
        };

        const [items, total] = await Promise.all([
            VendorProfileModel.find(findQuery)
                .skip(skip)
                .limit(limit)
                .populate("user", "name email mobile"),
            VendorProfileModel.countDocuments(countQuery),
        ]);

        return items;
    }
}