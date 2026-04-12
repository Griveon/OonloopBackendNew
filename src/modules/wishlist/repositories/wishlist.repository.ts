import { WishlistModel } from "../models/wishlist.model.js";

export class WishlistRepository {

    async findByUser(userId: string) {
        return await WishlistModel.findOne({ user: userId });
    }

    async create(userId: string) {
        return await WishlistModel.create({ user: userId, items: [] });
    }

    async save(wishlist: any) {
        return await wishlist.save();
    }

    async clear(userId: string) {
        return await WishlistModel.findOneAndUpdate(
            { user: userId },
            { items: [] },
            { new: true }
        );
    }
}