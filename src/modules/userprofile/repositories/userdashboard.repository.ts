import mongoose from "mongoose";
import { OrderModel } from "../../order/models/order.model.js";
import { WishlistModel } from "../../wishlist/models/wishlist.model.js";
import { CartModel } from "../../cart/models/cart.model.js";
import { UserProfileModel } from "../models/userprofile.model.js";

export class UserDashboardRepository {

    async getProfile(userId: string) {
        return await UserProfileModel.findOne({ user: userId }).populate("user");
    }

    async getWishlist(userId: string) {
        return await WishlistModel.findOne({ user: userId });
    }

    async getCart(userId: string) {
        return await CartModel.findOne({ user: userId });
    }

    async getOrderStats(userId: string) {
        const stats = await OrderModel.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $group: {
                    _id: "$user",
                    totalSpend: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        return stats[0] || {
            totalSpend: 0,
            orderCount: 0
        };
    }

    async getRecentOrders(userId: string) {
        return await OrderModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(5);
    }
}