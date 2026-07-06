import { OrderModel } from "../models/order.model.js";
import type { IOrder } from "../interfaces/order.interface.js";

export class OrderRepository {
    async create(data: Partial<IOrder>) {
        return await OrderModel.create(data);
    }

    async findById(id: string) {
        return await OrderModel.findById(id)
            .populate("user", "firstName lastName email mobileNumber")
            .populate("vendor", "firstName lastName email mobileNumber")
            .populate("vendors", "firstName lastName email mobileNumber")
            .populate("items.vendor", "firstName lastName email mobileNumber")
            .populate("items.product")
            .populate("paymentMethod")
            .populate("paymentTransaction")
            .populate("gstRuleId");
    }

    async findByOrderNumber(orderNumber: string) {
        return await OrderModel.findOne({ orderNumber })
            .populate("user", "firstName lastName email mobileNumber")
            .populate("vendor", "firstName lastName email mobileNumber")
            .populate("vendors", "firstName lastName email mobileNumber")
            .populate("items.vendor", "firstName lastName email mobileNumber")
            .populate("items.product")
            .populate("paymentMethod")
            .populate("paymentTransaction")
            .populate("gstRuleId");
    }

    async findByUser(
        userId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        const skip = (page - 1) * limit;

        const query = {
            ...filter,
            user: userId,
            isActive: true,
        };

        const [items, total] = await Promise.all([
            OrderModel.find(query)
                .populate("vendors", "firstName lastName email mobileNumber")
                .populate("items.vendor", "firstName lastName email mobileNumber")
                .populate("paymentMethod")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            OrderModel.countDocuments(query),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Parent order vendor search.
     * Use this only for admin/search/reporting.
     * Seller operational APIs should use OrderVendorModel later.
     */
    async findByVendorInParentOrder(
        vendorId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        const skip = (page - 1) * limit;

        const query = {
            ...filter,
            vendors: vendorId,
            isActive: true,
        };

        const [items, total] = await Promise.all([
            OrderModel.find(query)
                .populate("user", "firstName lastName email mobileNumber")
                .populate("vendors", "firstName lastName email mobileNumber")
                .populate("items.vendor", "firstName lastName email mobileNumber")
                .populate("paymentMethod")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            OrderModel.countDocuments(query),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findAll(filter: any = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const query = {
            ...filter,
            isActive: filter?.isActive ?? true,
        };

        const [items, total] = await Promise.all([
            OrderModel.find(query)
                .populate("user", "firstName lastName email mobileNumber")
                .populate("vendor", "firstName lastName email mobileNumber")
                .populate("vendors", "firstName lastName email mobileNumber")
                .populate("items.vendor", "firstName lastName email mobileNumber")
                .populate("paymentMethod")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            OrderModel.countDocuments(query),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(id: string, data: Partial<IOrder> | any) {
        return await OrderModel.findByIdAndUpdate(
            id,
            data,
            {
                new: true,
                runValidators: true,
            }
        )
            .populate("user", "firstName lastName email mobileNumber")
            .populate("vendor", "firstName lastName email mobileNumber")
            .populate("vendors", "firstName lastName email mobileNumber")
            .populate("items.vendor", "firstName lastName email mobileNumber")
            .populate("items.product")
            .populate("paymentMethod")
            .populate("paymentTransaction")
            .populate("gstRuleId");
    }

    async updateByIdWithoutValidators(id: string, data: any) {
        return await OrderModel.findByIdAndUpdate(
            id,
            data,
            {
                new: true,
            }
        );
    }

    async delete(id: string) {
        return await OrderModel.findByIdAndDelete(id);
    }

    async softDelete(id: string) {
        return await OrderModel.findByIdAndUpdate(
            id,
            {
                isActive: false,
            },
            {
                new: true,
            }
        );
    }
}