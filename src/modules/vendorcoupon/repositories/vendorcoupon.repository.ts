import { VendorCouponModel } from "../models/vendorcoupon.model.js";

export class VendorCouponRepository {

    async create(data: any) {
        return await VendorCouponModel.create(data);
    }

    async findById(id: string) {
        return await VendorCouponModel.findById(id);
    }

    async findAll(filters: {
        vendorId?: string;
        page: number;
        limit: number;
        isActive?: string;
        discountType?: string;
        couponType?: string;
        search?: string;
    }) {
        const {
            vendorId,
            page,
            limit,
            isActive,
            discountType,
            couponType,
            search,
        } = filters;

        const query: any = {};

        // ✅ Vendor filter
        if (vendorId) {
            query.vendorId = vendorId;
        }

        // ✅ Boolean filter
        if (isActive !== undefined) {
            query.isActive = isActive === "true";
        }

        // ✅ Enum filters
        if (discountType) {
            query.discountType = discountType;
        }

        if (couponType) {
            query.couponType = couponType;
        }

        // ✅ Search (couponCode + description)
        if (search) {
            query.$or = [
                { couponCode: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            VendorCouponModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            VendorCouponModel.countDocuments(query),
        ]);

        return {
            data,
            total,
            page,
            limit,
        };
    }
    
    async findByVendor(vendorId: string) {
        return await VendorCouponModel.find({ vendorId })
            .sort({ createdAt: -1 });
    }

    async update(id: string, data: any) {
        return await VendorCouponModel.findByIdAndUpdate(id, data, {
            new: true,
        });
    }

    async activate(id: string) {
        return await VendorCouponModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }

    async deactivate(id: string) {
        return await VendorCouponModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }
}