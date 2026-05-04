import { UserOrdersRepository } from "../repository/userorders.repository.js";

export class UserOrdersService {
    private repo: UserOrdersRepository;

    constructor() {
        this.repo = new UserOrdersRepository();
    }

    async getUserOrders(userId: any, page?: number, limit?: number) {
        if (!userId) throw new Error("User ID is required");

        return this.repo.getUserOrders(userId, page, limit);
    }

    async getOrderDetails(orderId: any, userId: any) {
        if (!orderId) throw new Error("Order ID is required");

        const order = await this.repo.getOrderById(orderId, userId);

        if (!order) {
            throw new Error("Order not found");
        }

        return order;
    }
}