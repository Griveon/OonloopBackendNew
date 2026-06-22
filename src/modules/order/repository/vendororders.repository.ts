// repository/vendororders.repository.ts

import { OrderModel } from "../models/order.model.js";

export class VendorOrderRepository {

    async findByVendor(
        vendorId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        const skip = (page - 1) * limit;

        const query: any = {
            vendor: vendorId,
        };

        if (filter.status) {
            query.status = filter.status;
        }

        if (filter.paymentStatus) {
            query.paymentStatus = filter.paymentStatus;
        }

        if (filter.orderNumber) {
            query.orderNumber = {
                $regex: filter.orderNumber,
                $options: "i",
            };
        }

        const [items, total] = await Promise.all([
            OrderModel.find(query)
                .populate(
                    "user",
                    "firstName lastName email mobileNumber"
                )
                .populate("paymentMethod")
                .populate("gstRuleId")
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

    async updateOrderStatus(
        orderId: string,
        vendorId: string,
        status: string
    ) {
        const updateData: any = {
            status,
        };

        if (status === "shipped") {
            updateData.shippedAt = new Date();
        }

        if (status === "delivered") {
            updateData.deliveredAt = new Date();
        }

        if (status === "cancelled") {
            updateData.cancelledAt = new Date();
        }

        return await OrderModel.findOneAndUpdate(
            {
                _id: orderId,
                vendor: vendorId,
            },
            updateData,
            {
                new: true,
                runValidators: true,
            }
        )
            .populate(
                "user",
                "firstName lastName email mobileNumber"
            )
            .populate("paymentMethod")
            .populate("gstRuleId");
    }
}