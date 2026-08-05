import { ShopperPhotoModel } from "../models/personalshopperphoto.model.js";
import type { IShopperPhoto } from "../interfaces/personalshopperphoto.interface.js";

export class ShopperPhotoRepository {
    async create(data: Partial<IShopperPhoto>) {
        return ShopperPhotoModel.create(data);
    }

    async findByBooking(bookingId: string) {
        return ShopperPhotoModel.find({ booking: bookingId })
            .sort({ createdAt: 1 })
            .populate("rider", "firstName lastName");
    }

    async findById(id: string) {
        return ShopperPhotoModel.findById(id);
    }

    async updateById(id: string, data: Partial<IShopperPhoto>) {
        return ShopperPhotoModel.findByIdAndUpdate(id, data, { new: true });
    }

    async pendingCount(bookingId: string) {
        return ShopperPhotoModel.countDocuments({
            booking: bookingId,
            status: "pending",
        });
    }
}
