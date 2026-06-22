import { ProductModel } from "../../product/models/product.model.js";
import { OrderRepository } from "../repository/order.repository.js";
import { generateOrderNumber } from "../utils/ordernumbergenerate.util.js";

export class OrderService {
    private repo = new OrderRepository();

    async create(data: any) {
        let subtotal = 0;

        data.orderNumber = await generateOrderNumber();

        for (const item of data.items) {
            const product = await ProductModel.findById(item.product);

            if (!product) throw new Error("Product not found");

            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            item.total = itemTotal;
        }

        const platformFee = 49;

        const totalAmount = subtotal + platformFee;

        data.subtotal = subtotal;
        data.platformFee = platformFee;
        data.totalAmount = totalAmount;

        return await this.repo.create(data);
    }

    async getById(id: any) {
        const order = await this.repo.findById(id);
        if (!order) throw new Error("Order not found");
        return order;
    }

    async getAll(page = 1, limit = 10, filter: any = {}) {
        return await this.repo.findAll(filter, page, limit);
    }

    // services/order.service.ts

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

    async update(id: any, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Order not found");
        return await this.repo.update(id, data);
    }

    async delete(id: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Order not found");
        return await this.repo.delete(id);
    }
}