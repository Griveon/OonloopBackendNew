import { ProductModel } from "../models/product.model.js";
import type { IProduct } from "../interfaces/product.interface.js";
import { VendorCouponModel } from "../../vendorcoupon/models/vendorcoupon.model.js";

export class ProductRepository {
    async create(data: IProduct) {
        return await ProductModel.create(data);
    }

    async findById(id: string) {
        return await ProductModel.findById(id);
    }

    async findByCouponId(id: string) {
        return VendorCouponModel.findById(id);
    }

    async findAll(filter: any = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            ProductModel.find(filter).skip(skip).limit(limit),
            ProductModel.countDocuments(filter)
        ]);
        return { items, total };
    }

    async findByVendor(filter: any = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            ProductModel.find(filter).skip(skip).limit(limit),
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
                .sort({ createdAt: -1 }),

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

    async getVendorCouponProducts(
        vendorId: string,
        page = 1,
        limit = 10
    ) {
        const skip = (page - 1) * limit;

        const filter = {
            vendorId,
            isActive: true,
        };

        const [items, total] = await Promise.all([
            ProductModel.find(filter)
                .populate("category")
                .populate("productCategory")
                .populate("unit")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            ProductModel.countDocuments(filter),
        ]);

        return {
            items,
            total,
            page,
            limit,
        };
    }
}