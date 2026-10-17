import { ProductModel } from "../models/product.model.js";
import type { IProduct } from "../interfaces/product.interface.js";
import { VendorCouponModel } from "../../vendorcoupon/models/vendorcoupon.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";

export class ProductRepository {
    async create(data: IProduct) {
        return await ProductModel.create(data);
    }

    async findById(id: string) {
        return await ProductModel.findById(id)
            .populate("variants.unit")
            .populate("unit");
    }

    async findByCouponId(id: string) {
        return VendorCouponModel.findById(id);
    }

    async findAll(filter: any = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            ProductModel.find(filter).skip(skip).limit(limit).lean(),
            ProductModel.countDocuments(filter)
        ]);
        return { items, total };
    }

    async findByVendor(filter: any = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            ProductModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ProductModel.countDocuments(filter),
        ]);

        return { items, total, page, limit };
    }

    async update(id: string, data: Partial<IProduct>) {
        return await ProductModel.findByIdAndUpdate(id, data, { new: true });
    }

    async delete(id: string) {
        return await ProductModel.findByIdAndDelete(id);
    }

    async searchByVendor(
        vendorId: string,
        search: string,
        page = 1,
        limit = 10
    ) {
        const skip = (page - 1) * limit;

        const filter: any = {
            vendorId,
        };

        if (search?.trim()) {
            filter.$or = [
                {
                    name: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    slug: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            ProductModel.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean(),

            ProductModel.countDocuments(filter),
        ]);

        return {
            items,
            total,
            page,
            limit,
        };
    }

    async searchMainCatalog(
        keyword: string,
        page = 1,
        limit = 10
    ) {
        const skip = (page - 1) * limit;

        const regex = new RegExp(keyword, "i");

        const pipeline: any[] = [
            {
                $match: {
                    isMainCatalogProduct: true,
                },
            },

            // Join Brand collection
            {
                $lookup: {
                    from: "brands",
                    localField: "attributes.brand",
                    foreignField: "_id",
                    as: "brand",
                },
            },
            {
                $unwind: {
                    path: "$brand",
                    preserveNullAndEmptyArrays: true,
                },
            },

            // Search by product name OR brand name
            {
                $match: {
                    $or: [
                        { name: regex },
                        { "brand.name": regex },
                    ],
                },
            },

            {
                $sort: { createdAt: -1 },
            },

            {
                $facet: {
                    items: [
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    totalCount: [
                        { $count: "count" },
                    ],
                },
            },
        ];

        const result = await ProductModel.aggregate(pipeline);

        const items = result[0]?.items || [];
        const total = result[0]?.totalCount?.[0]?.count || 0;

        return {
            items,
            total,
            page,
            limit,
        };
    }

    async findRecentByPincode(pincode: string, limit = 50) {
        // 1. Vendors whose store is registered in this pincode
        const vendors = await VendorProfileModel.find({
            "storeLocationAddress.postalCode": pincode,
        }).select("user").lean();

        const vendorIds = vendors.map((v) => v.user);

        if (vendorIds.length === 0) {
            return [];
        }

        // 2. Their most recently added active products
        return ProductModel.find({
            isActive: true,
            vendorId: { $in: vendorIds },
            ...this.getAvailableProductFilter(),
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("category")
            .populate("productCategory")
            .populate("unit")
            .populate("vendorId", "firstName lastName")
            .lean();
    }

    async getVendorCouponProducts(
        vendorId: string,
        page = 1,
        limit = 10
    ) {
        const skip = (page - 1) * limit;

        const filter = {
            vendorId,
            isActive: true,
            ...this.getAvailableProductFilter(),
        };

        const [items, total] = await Promise.all([
            ProductModel.find(filter)
                .populate("category")
                .populate("productCategory")
                .populate("unit")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            ProductModel.countDocuments(filter),
        ]);

        return {
            items,
            total,
            page,
            limit,
        };
    }

    private getCurrentMinutes() {
        const now = new Date();

        // India timezone
        const indiaTime = new Date(
            now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );

        return indiaTime.getHours() * 60 + indiaTime.getMinutes();
    }

    private getAvailableProductFilter() {
        const currentMinutes = this.getCurrentMinutes();

        return {
            $or: [
                {
                    "availability.type": "always",
                },

                {
                    $and: [
                        { "availability.type": "scheduled" },
                        {
                            $expr: {
                                $lte: [
                                    "$availability.fromMinutes",
                                    "$availability.toMinutes",
                                ],
                            },
                        },
                        {
                            "availability.fromMinutes": {
                                $lte: currentMinutes,
                            },
                        },
                        {
                            "availability.toMinutes": {
                                $gte: currentMinutes,
                            },
                        },
                    ],
                },

                // Overnight schedule example: 22:00 to 02:00
                {
                    $and: [
                        { "availability.type": "scheduled" },
                        {
                            $expr: {
                                $gt: [
                                    "$availability.fromMinutes",
                                    "$availability.toMinutes",
                                ],
                            },
                        },
                        {
                            $or: [
                                {
                                    "availability.fromMinutes": {
                                        $lte: currentMinutes,
                                    },
                                },
                                {
                                    "availability.toMinutes": {
                                        $gte: currentMinutes,
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        };
    }

    async incrementViewCount(id: string) {
        return await ProductModel.findOneAndUpdate(
            { _id: id, isActive: true },
            { $inc: { viewCount: 1 } },
            { new: true, projection: { _id: 1, viewCount: 1 } }
        );
    }

    async findMostViewed(options: {
        limit?: number | undefined;
        page?: number | undefined;
        pincode?: string | undefined;
        vendorId?: string | undefined;
        categoryId?: string | undefined;
        minViews?: number | undefined;
    } = {}) {
        const page = Math.max(Number(options.page) || 1, 1);
        const limit =
            options.limit !== undefined && Number(options.limit) > 0
                ? Math.min(Number(options.limit), 50)
                : 50;
        const skip = (page - 1) * limit;

        const filter: any = {
            isActive: true,
            ...this.getAvailableProductFilter(),
        };

        if (options.pincode?.trim()) {
            const vendors = await VendorProfileModel.find({
                "storeLocationAddress.postalCode": options.pincode.trim(),
            }).select("user");

            const vendorIds = vendors.map((v) => v.user);
            if (vendorIds.length === 0) {
                return { items: [], total: 0, page, limit };
            }
            filter.vendorId = { $in: vendorIds };
        } else if (options.vendorId) {
            filter.vendorId = options.vendorId;
        }

        if (options.categoryId) {
            filter.category = options.categoryId;
        }

        const minViews = options.minViews !== undefined ? options.minViews : 1;
        if (minViews > 0) {
            filter.viewCount = { $gte: minViews };
        }

        let query = ProductModel.find(filter).sort({ viewCount: -1, _id: 1 });

        if (skip > 0) {
            query = query.skip(skip);
        }
        if (limit) {
            query = query.limit(limit);
        }

        const [items, total] = await Promise.all([
            query
                .populate("category")
                .populate("productCategory")
                .populate("unit")
                .populate("variants.unit")
                .populate("vendorId", "firstName lastName")
                .lean(),
            ProductModel.countDocuments(filter),
        ]);

        return { items, total, page, limit };
    }

    async findMostBought(options: {
        limit?: number | undefined;
        page?: number | undefined;
        pincode?: string | undefined;
        vendorId?: string | undefined;
        categoryId?: string | undefined;
        minSold?: number | undefined;
    } = {}) {
        const page = Math.max(Number(options.page) || 1, 1);
        const limit =
            options.limit !== undefined && Number(options.limit) > 0
                ? Math.min(Number(options.limit), 50)
                : 50;
        const skip = (page - 1) * limit;

        const filter: any = {
            isActive: true,
            ...this.getAvailableProductFilter(),
        };

        if (options.pincode?.trim()) {
            const vendors = await VendorProfileModel.find({
                "storeLocationAddress.postalCode": options.pincode.trim(),
            }).select("user");

            const vendorIds = vendors.map((v) => v.user);
            if (vendorIds.length === 0) {
                return { items: [], total: 0, page, limit };
            }
            filter.vendorId = { $in: vendorIds };
        } else if (options.vendorId) {
            filter.vendorId = options.vendorId;
        }

        if (options.categoryId) {
            filter.category = options.categoryId;
        }

        const minSold = options.minSold !== undefined ? options.minSold : 1;
        if (minSold > 0) {
            filter.soldCount = { $gte: minSold };
        }

        let query = ProductModel.find(filter).sort({ soldCount: -1, _id: 1 });

        if (skip > 0) {
            query = query.skip(skip);
        }
        if (limit) {
            query = query.limit(limit);
        }

        const [items, total] = await Promise.all([
            query
                .populate("category")
                .populate("productCategory")
                .populate("unit")
                .populate("variants.unit")
                .populate("vendorId", "firstName lastName")
                .lean(),
            ProductModel.countDocuments(filter),
        ]);

        return { items, total, page, limit };
    }
}