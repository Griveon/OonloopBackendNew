import { OrderModel } from "../models/order.model.js";
import { DriverOrderRepository } from "../repository/driverorders.repository.js";

const validDeliveryTransitions:
    any = {

    not_assigned: [
        "assigned",
    ],

    assigned: [
        "pickup_pending",
    ],

    pickup_pending: [
        "picked_up",
        "failed",
    ],

    picked_up: [
        "out_for_delivery",
        "failed",
    ],

    out_for_delivery: [
        "delivered",
        "failed",
        "returned",
    ],

    delivered: [],

    failed: [
        "out_for_delivery",
        "returned",
    ],

    returned: [],
};

export class DriverOrderService {

    private repo =
        new DriverOrderRepository();


    async assignDriver(
        orderId: any,
        driverId: string
    ) {
        const order =
            await OrderModel.findById(orderId);

        if (!order) {
            throw new Error("Order not found");
        }

        if (order.driver) {
            throw new Error(
                "Driver already assigned"
            );
        }

        const updatedOrder =
            await this.repo.assignDriver(
                orderId,
                driverId
            );

        if (!updatedOrder) {
            throw new Error("Order not found");
        }

        return updatedOrder;
    }

    async updateDeliveryStatus(
        orderId: any,
        driverId: string,
        deliveryStatus: any
    ) {

        const order =
            await OrderModel.findById(
                orderId
            );

        console.log(orderId)
        console.log(order)

        if (!order) {
            throw new Error(
                "Order not found"
            );
        }

        const currentStatus =
            order.deliveryStatus || "not_assigned";

        const allowedStatuses =
            validDeliveryTransitions[currentStatus] || [];

        if (
            !allowedStatuses.includes(
                deliveryStatus
            )
        ) {
            throw new Error(
                `Cannot change delivery status from ${order.deliveryStatus} to ${deliveryStatus}`
            );
        }

        const updatedOrder =
            await this.repo.updateDeliveryStatus(
                orderId,
                driverId,
                deliveryStatus
            );

        if (!updatedOrder) {
            console.log("smothing")

            throw new Error(
                "Order not found"
            );
        }

        return updatedOrder;
    }

    async getDriverOrders(
        driverId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        return await this.repo.findByDriver(
            driverId,
            page,
            limit,
            filter
        );
    }

    async getHistory(
        driverId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {

        if (!driverId) {
            throw new Error(
                "Driver Id is required"
            );
        }

        return this.repo.getHistory(
            driverId,
            page,
            limit,
            filter
        );
    }

    async getStats(
        driverId: any
    ) {

        if (!driverId) {
            throw new Error(
                "Driver Id is required"
            );
        }

        return this.repo.getStats(
            driverId
        );
    }



}