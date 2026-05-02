import { OrderModel } from "../models/order.model.js";
import type { IOrder } from "../interfaces/order.interface.js";

export class OrderRepository {
    async create(data: Partial<IOrder>) {
        return await OrderModel.create(data);
    }

    async findById(id: string) {
        return await OrderModel.findById(id)
            .populate("user")
            .populate("vendor")
            .populate("paymentMethod")
            .populate("gstRuleId");
    }

    async findAll(filter: any = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            OrderModel.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            OrderModel.countDocuments(filter),
        ]);

        return { items, total };
    }

    async update(id: string, data: Partial<IOrder>) {
        return await OrderModel.findByIdAndUpdate(id, data, { new: true });
    }

    async delete(id: string) {
        return await OrderModel.findByIdAndDelete(id);
    }
}