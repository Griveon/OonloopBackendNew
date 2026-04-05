import { VendorCouponModel } from "../models/vendorcoupon.model.js";

export class VendorCouponRepository {

    async create(data: any) {
        return await VendorCouponModel.create(data);
    }

    async findById(id: string) {
        return await VendorCouponModel.findById(id);
    }

    async findAll() {
        return await VendorCouponModel.find().sort({ createdAt: -1 });
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