import { ProductModel } from "../../product/models/product.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import mongoose from "mongoose";

export class CategoryProductsRepository {

    async findByCategory(
        categoryId: string,
        lat: number,
        lng: number,
        maxDistance: number,
        skip: number,
        limit: number,
        search: string
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
        }).select("user");

        const vendorIds = nearbyVendors
            .map(v => v.user)
            .filter(Boolean)
            .map((id:any) => new mongoose.Types.ObjectId(id));

        if (!vendorIds.length) {
            return {
                products: [],
                total: 0,
            };
        }

        const match: any = {
            vendorId: { $in: vendorIds },
            category: new mongoose.Types.ObjectId(categoryId)
        };

        if (search && search.trim()) {
            match.name = {
                $regex: search,
                $options: "i",
            };
        }

        const [products, total] = await Promise.all([
            ProductModel.find(match)
                .populate("productCategory")
                .populate("category")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            ProductModel.countDocuments(match),
        ]);

        return {
            products,
            total,
        };
    }
}