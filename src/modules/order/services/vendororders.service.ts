// services/vendororders.service.ts

import { OrderModel } from "../models/order.model.js";
import { VendorOrderRepository } from "../repository/vendororders.repository.js";

const validTransitions: Record<string, string[]> = {
    pending: ["placed", "cancelled"],

    placed: [
        "confirmed",
        "cancelled",
    ],

    confirmed: [
        "waiting_for_packing",
        "cancelled",
    ],

    waiting_for_packing: [
        "packed",
        "cancelled",
    ],

    packed: [
        "waiting_for_delivery_partner",
        "cancelled",
    ],

    waiting_for_delivery_partner: [
        "shipped",
        "cancelled",
    ],

    shipped: [
        "delivered",
        "returned",
    ],

    delivered: [
        "returned",
    ],

    cancelled: [],

    returned: [],
};

export class VendorOrderService {

    private repo = new VendorOrderRepository();

    async getVendorOrders(
        vendorId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        return await this.repo.findByVendor(
            vendorId,
            page,
            limit,
            filter
        );
    }

    async updateOrderStatus(
        orderId: any,
        vendorId: string,
        status: string
    ) {
        const order = await OrderModel.findById(orderId);

        if (!order) {
            throw new Error("Order not found");
        }

        const allowedStatuses =
            validTransitions[order.status] || [];

        if (!allowedStatuses.includes(status)) {
            throw new Error(
                `Cannot change status from ${order.status} to ${status}`
            );
        }

        const updatedOrder =
            await this.repo.updateOrderStatus(
                orderId,
                vendorId,
                status
            );

        if (!updatedOrder) {
            throw new Error("Order not found");
        }

        return updatedOrder;
    }
}