import { OrderModel } from "../models/order.model.js";

export class UserOrdersRepository {

    async getUserOrders(userId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        // Preorder-sourced orders live under the Preorders list, not here.
        const query = { user: userId, isActive: true, isPreorder: { $ne: true } };

        const [orders, total] = await Promise.all([
            OrderModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("vendor", "name email") // optional
                .populate("paymentMethod", "name type") // optional
                .lean(),

            OrderModel.countDocuments(query)
        ]);

        return {
            orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getOrderById(orderId: string, userId: string) {
        return OrderModel.findOne({
            _id: orderId,
            user: userId,
            isActive: true,
        })
            .populate("vendor", "name email")
            .populate("paymentMethod", "name type")
            .populate("paymentTransaction")
            .lean();
    }
}