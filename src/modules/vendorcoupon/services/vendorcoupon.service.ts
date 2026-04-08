import { VendorCouponRepository } from "../repositories/vendorcoupon.repository.js";

export class VendorCouponService {
    private repo: VendorCouponRepository;

    constructor() {
        this.repo = new VendorCouponRepository();
    }

    async create(data: any) {
        return await this.repo.create(data);
    }

    async getAll(filters: {
        vendorId?: string;
        page: number;
        limit: number;
        isActive?: string;
        discountType?: string;
        couponType?: string;
        search?: string;
    }) {
        return await this.repo.findAll(filters);
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Coupon not found");
        return item;
    }

    async getByVendor(vendorId: string) {
        return await this.repo.findByVendor(vendorId);
    }

    async update(id: string, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Coupon not found");

        return await this.repo.update(id, data);
    }

    async delete(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Coupon not found");

        return await this.repo.deactivate(id); // soft delete
    }

    async activate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Coupon not found");

        return await this.repo.activate(id);
    }

    async deactivate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Coupon not found");

        return await this.repo.deactivate(id);
    }
}