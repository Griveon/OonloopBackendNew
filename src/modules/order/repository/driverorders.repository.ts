import { OrderModel } from "../models/order.model.js";

export class DriverOrderRepository {

    async assignDriver(
        orderId: string,
        driverId: string
    ) {
        return await OrderModel.findByIdAndUpdate(
            orderId,
            {
                driver: driverId,
                deliveryStatus: "assigned",
                driverAssignedAt: new Date(),
            },
            {
                new: true,
                runValidators: true,
            }
        )
            .populate(
                "user",
                "firstName lastName email mobileNumber"
            )
            .populate("vendor")
            .populate("paymentMethod");
    }

    async updateDeliveryStatus(
        orderId: string,
        driverId: string,
        deliveryStatus: string
    ) {

        const updateData: any = {
            deliveryStatus,
        };

        console.log(updateData);

        if (deliveryStatus === "assigned") {
            updateData.driverAssignedAt = new Date();
        }

        if (deliveryStatus === "picked_up") {
            updateData.pickedUpAt = new Date();

            // updateData.status = "shipped";
        }

        if (
            deliveryStatus ===
            "out_for_delivery"
        ) {
            updateData.outForDeliveryAt =
                new Date();
        }

        if (
            deliveryStatus ===
            "delivered"
        ) {
            updateData.deliveredAt =
                new Date();

            updateData.status =
                "delivered";
        }
        console.log("comes")

        return await OrderModel.findOneAndUpdate(
            {
                _id: orderId,
                driver: driverId,
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
            .populate("vendor")
            .populate("paymentMethod");
    }

    // repository/driverorders.repository.ts

    async findByDriver(
        driverId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        const skip = (page - 1) * limit;

        const query: any = {
            driver: driverId,
        };

        if (filter.deliveryStatus) {
            query.deliveryStatus =
                filter.deliveryStatus;
        }

        if (filter.orderNumber) {
            query.orderNumber = {
                $regex: filter.orderNumber,
                $options: "i",
            };
        }

        const [items, total] =
            await Promise.all([

                OrderModel.find(query)
                    .populate(
                        "user",
                        "firstName lastName email mobileNumber"
                    )
                    .populate(
                        "vendor",
                        "firstName lastName email mobileNumber"
                    )
                    .populate("paymentMethod")
                    .sort({
                        createdAt: -1,
                    })
                    .skip(skip)
                    .limit(limit),

                OrderModel.countDocuments(
                    query
                ),
            ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(
                total / limit
            ),
        };
    }

    async getHistory(
        driverId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {

        const skip = (page - 1) * limit;

        const query: any = {
            driver: driverId,

            deliveryStatus: {
                $in: [
                    "delivered",
                    "failed",
                    "returned",
                ],
            },
        };

        if (filter.orderNumber) {
            query.orderNumber = {
                $regex: filter.orderNumber,
                $options: "i",
            };
        }

        if (filter.fromDate && filter.toDate) {
            query.createdAt = {
                $gte: new Date(filter.fromDate),
                $lte: new Date(filter.toDate),
            };
        }

        const [items, total] =
            await Promise.all([

                OrderModel.find(query)
                    .populate(
                        "user",
                        "firstName lastName email mobileNumber"
                    )
                    .populate(
                        "vendor",
                        "firstName lastName email mobileNumber"
                    )
                    .populate("paymentMethod")
                    .sort({
                        deliveredAt: -1,
                    })
                    .skip(skip)
                    .limit(limit),

                OrderModel.countDocuments(query),
            ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(
                total / limit
            ),
        };
    }

    async getStats(driverId: string) {

        const startOfToday = new Date();

        startOfToday.setHours(
            0,
            0,
            0,
            0
        );

        const [
            totalOrders,
            deliveredOrders,
            failedOrders,
            returnedOrders,
            activeOrders,
            todayOrders,
        ] = await Promise.all([

            OrderModel.countDocuments({
                driver: driverId,
            }),

            OrderModel.countDocuments({
                driver: driverId,
                deliveryStatus: "delivered",
            }),

            OrderModel.countDocuments({
                driver: driverId,
                deliveryStatus: "failed",
            }),

            OrderModel.countDocuments({
                driver: driverId,
                deliveryStatus: "returned",
            }),

            OrderModel.countDocuments({
                driver: driverId,
                deliveryStatus: {
                    $in: [
                        "assigned",
                        "pickup_pending",
                        "picked_up",
                        "out_for_delivery",
                    ],
                },
            }),

            OrderModel.countDocuments({
                driver: driverId,
                createdAt: {
                    $gte: startOfToday,
                },
            }),
        ]);

        return {
            totalOrders,
            deliveredOrders,
            failedOrders,
            returnedOrders,
            activeOrders,
            todayOrders,
        };
    }


}