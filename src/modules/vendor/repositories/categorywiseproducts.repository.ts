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
        search: string,
        vendorId?: string
    ) {

        let vendorIds: mongoose.Types.ObjectId[] = [];

        /**
         * CASE 1: If vendorId is provided → ignore geo filter
         */
        if (vendorId) {
            vendorIds = [new mongoose.Types.ObjectId(vendorId)];
        }

        /**
         * CASE 2: No vendorId → find nearby vendors
         */
        else {
            const nearbyVendors = await VendorProfileModel.find({
                "storeLocationAddress.location": {
                    $geoWithin: {
                        $centerSphere: [
                            [lng, lat],
                            maxDistance / 6378100, // radius in radians
                        ],
                    },
                },
            }).select("user");

            vendorIds = nearbyVendors
                .map(v => v.user)
                .filter(Boolean)
                .map(id => new mongoose.Types.ObjectId(id));
        }

        if (!vendorIds.length) {
            return { products: [], total: 0 };
        }

        const match: any = {
            vendorId: { $in: vendorIds },
            category: new mongoose.Types.ObjectId(categoryId),
        };

        if (search?.trim()) {
            match.name = {
                $regex: search.trim(),
                $options: "i",
            };
        }
        // const test = await ProductModel.find({
        //     vendorId: { $in: vendorIds }
        // }).limit(5);

        // const testCategory = await ProductModel.find({
        //     category: new mongoose.Types.ObjectId(categoryId)
        // }).limit(5);

        // console.log("Category only test:", testCategory);

        // console.log("Nearby vendors found:", vendorIds, "Sample products:", test);

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

        return { products, total };
    }
}