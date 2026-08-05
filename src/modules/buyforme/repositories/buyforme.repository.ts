import { BuyForMeRequestModel } from "../models/buyforme.model.js";
import { BuyForMeItemModel } from "../models/buyformeitem.model.js";
import type { IBuyForMeRequest } from "../interfaces/buyforme.interface.js";
import type { IBuyForMeItem } from "../interfaces/buyformeitem.interface.js";

export class BuyForMeRepository {
    // ----- request -----
    async createRequest(data: Partial<IBuyForMeRequest>) {
        return BuyForMeRequestModel.create(data);
    }

    async findDraftByUser(userId: string) {
        return BuyForMeRequestModel.findOne({
            user: userId,
            status: "draft",
            isActive: true,
        });
    }

    async findById(id: string) {
        return BuyForMeRequestModel.findById(id)
            .populate("user", "firstName lastName mobileNumber")
            .populate("shopper", "firstName lastName mobileNumber")
            .populate("preferredStore.storeId", "storeName");
    }

    async updateById(id: string, data: Partial<IBuyForMeRequest>) {
        return BuyForMeRequestModel.findByIdAndUpdate(id, data, { new: true });
    }

    async findByUser(userId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const q: any = { user: userId, isActive: true, status: { $ne: "draft" } };
        const [items, total] = await Promise.all([
            BuyForMeRequestModel.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
            BuyForMeRequestModel.countDocuments(q),
        ]);
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async generateRequestNumber() {
        const t = new Date();
        const y = t.getFullYear();
        const m = String(t.getMonth() + 1).padStart(2, "0");
        const d = String(t.getDate()).padStart(2, "0");
        const count = await BuyForMeRequestModel.countDocuments({
            createdAt: {
                $gte: new Date(`${y}-${m}-${d}T00:00:00.000Z`),
                $lte: new Date(`${y}-${m}-${d}T23:59:59.999Z`),
            },
        });
        return `BFM-${y}${m}${d}-${String(count + 1).padStart(4, "0")}`;
    }

    // ----- items -----
    async addItem(data: Partial<IBuyForMeItem>) {
        return BuyForMeItemModel.create(data);
    }

    async findItemsByRequest(requestId: string) {
        return BuyForMeItemModel.find({ request: requestId })
            .sort({ createdAt: 1 })
            .populate("product", "name mrp images");
    }

    async findItemById(itemId: string) {
        return BuyForMeItemModel.findById(itemId);
    }

    async updateItem(itemId: string, data: Partial<IBuyForMeItem>) {
        return BuyForMeItemModel.findByIdAndUpdate(itemId, data, { new: true });
    }

    async deleteItem(itemId: string) {
        return BuyForMeItemModel.findByIdAndDelete(itemId);
    }

    async countItems(requestId: string) {
        return BuyForMeItemModel.countDocuments({ request: requestId });
    }

    // ----- shopper offer/accept (mirror personalshopper) -----
    async findOpenRequests() {
        return BuyForMeRequestModel.find({
            status: "finding_shopper",
            paymentStatus: "paid",
            shopper: null,
            isActive: true,
        })
            .sort({ createdAt: 1 })
            .populate("user", "firstName lastName mobileNumber");
    }

    async acceptAtomic(requestId: string, shopperId: string) {
        return BuyForMeRequestModel.findOneAndUpdate(
            { _id: requestId, status: "finding_shopper", shopper: null },
            { shopper: shopperId, status: "shopper_assigned" },
            { new: true }
        ).populate("user", "firstName lastName mobileNumber");
    }

    async isShopperBusy(shopperId: string) {
        const n = await BuyForMeRequestModel.countDocuments({
            shopper: shopperId,
            status: { $in: ["shopper_assigned", "shopping", "ready", "out_for_delivery"] },
            isActive: true,
        });
        return n > 0;
    }

    async findByShopper(shopperId: string) {
        return BuyForMeRequestModel.find({
            shopper: shopperId,
            status: { $in: ["shopper_assigned", "shopping", "ready", "out_for_delivery"] },
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .populate("user", "firstName lastName mobileNumber");
    }
}
