import { CartModel } from "../models/cart.model.js";

export class CartRepository {

    async findByUser(userId: string) {
        return await CartModel.findOne({ user: userId });
    }

    async create(userId: string) {
        return await CartModel.create({ user: userId, items: [] });
    }

    async findOrCreate(userId: string) {
        try {
            return await CartModel.findOneAndUpdate(
                { user: userId },
                { $setOnInsert: { user: userId, items: [] } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        } catch (error: any) {
            // Handles the narrow race where two first requests upsert the same
            // unique user cart at once.
            if (error?.code === 11000) {
                const cart = await CartModel.findOne({ user: userId });
                if (cart) return cart;
            }
            throw error;
        }
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
