import { CartModel } from "../models/cart.model.js";

export class CartRepository {

    async findByUser(userId: string) {
        return await CartModel.findOne({ user: userId });
    }

    async create(userId: string) {
        return await CartModel.create({ user: userId, items: [] });
    }

    async update(cartId: string, data: any) {
        return await CartModel.findByIdAndUpdate(cartId, data, { new: true });
    }

    async save(cart: any) {
        return await cart.save();
    }

    async clear(userId: string) {
        return await CartModel.findOneAndUpdate(
            { user: userId },
            { items: [] },
            { new: true }
        );
    }
}