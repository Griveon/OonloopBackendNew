import { VendorSubscriptionModel } from "../models/vendorsubscription.model.js";
import type { IVendorSubscription } from "../interfaces/vendorsubscription.interface.js";

export class VendorSubscriptionRepository {

    async create(data: Partial<IVendorSubscription>) {
        return await VendorSubscriptionModel.create(data);
    }

    async findAll() {
        return await VendorSubscriptionModel.find({
            isActive: true,
        }).sort({ createdAt: -1 });
    }

    async findById(id: string) {
        return await VendorSubscriptionModel.findOne({
            _id: id,
            isActive: true,
        });
    }

    async findActiveByVendor(vendor: string) {
        return await VendorSubscriptionModel.findOne({
            vendor,
            status: "active",
            isActive: true,
        });
    }

    async update(id: string, data: Partial<IVendorSubscription>) {
        return await VendorSubscriptionModel.findByIdAndUpdate(
            id,
            data,
            { new: true }
        );
    }

    async softDelete(id: string) {
        return await VendorSubscriptionModel.findByIdAndUpdate(
            id,
            {
                isActive: false,
                status: "cancelled",
                cancelledAt: new Date(),
            },
            { new: true }
        );
    }

    async activate(id: string) {
        return await VendorSubscriptionModel.findByIdAndUpdate(
            id,
            {
                status: "active",
                isActive: true,
            },
            { new: true }
        );
    }

    async deactivate(id: string) {
        return await VendorSubscriptionModel.findByIdAndUpdate(
            id,
            {
                status: "cancelled",
                isActive: false,
                cancelledAt: new Date(),
            },
            { new: true }
        );
    }
}