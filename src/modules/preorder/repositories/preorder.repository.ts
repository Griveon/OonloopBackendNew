import mongoose from "mongoose";
import { PreorderConfigModel } from "../models/preorderconfig.model.js";
import { PreorderOrderModel } from "../models/preorderorder.model.js";
import { ProductModel } from "../../product/models/product.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import type {
    IPreorderConfig,
    IPreorderOrder,
} from "../interfaces/preorder.interface.js";

export class PreorderRepository {
    // ---------------- Seller config ----------------

    async upsertConfig(
        productId: string,
        vendorId: string,
        data: Partial<IPreorderConfig>
    ) {
        return PreorderConfigModel.findOneAndUpdate(
            { product: productId },
            {
                $set: {
                    ...data,
                    product: productId,
                    vendor: vendorId,
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    }

    async findConfigByProduct(productId: string) {
        return PreorderConfigModel.findOne({ product: productId });
    }

    async findActiveConfigByProduct(productId: string) {
        return PreorderConfigModel.findOne({
            product: productId,
            isActive: true,
        });
    }

    async findConfigsByVendor(vendorId: string) {
        return PreorderConfigModel.find({ vendor: vendorId })
            .populate("product", "name images mrp isActive")
            .sort({ updatedAt: -1 });
    }

    async setConfigActive(productId: string, vendorId: string, isActive: boolean) {
        return PreorderConfigModel.findOneAndUpdate(
            { product: productId, vendor: vendorId },
            { $set: { isActive } },
            { new: true }
        );
    }

    /**
     * Preorderable products near a point (same radius approach as the normal
     * category listing), each with its active preorder config attached.
     */
    async findPreorderProducts(
        lat: number,
        lng: number,
        maxDistance: number,
        skip: number,
        limit: number,
        search?: string
    ) {
        const nearbyVendors = await VendorProfileModel.find({
            "storeLocationAddress.location": {
                $geoWithin: {
                    $centerSphere: [[lng, lat], maxDistance / 6378100],
                },
            },
        }).select("user");

        const vendorIds = nearbyVendors
            .map((v) => v.user)
            .filter(Boolean)
            .map((id) => new mongoose.Types.ObjectId(id));

        if (!vendorIds.length) {
            return { items: [], total: 0 };
        }

        const configFilter: any = {
            vendor: { $in: vendorIds },
            isActive: true,
        };

        const configs = await PreorderConfigModel.find(configFilter)
            .populate({
                path: "product",
                match: { isActive: true },
                populate: [
                    { path: "category" },
                    { path: "productCategory" },
                    { path: "unit" },
                ],
            })
            .sort({ updatedAt: -1 });

        // Drop configs whose product is inactive (populate match -> null) or
        // filtered out by the search term.
        const searchText = search?.trim()?.toLowerCase();
        let rows = configs.filter((c: any) => {
            if (!c.product) return false;
            if (searchText) {
                const name = String(c.product.name || "").toLowerCase();
                if (!name.includes(searchText)) return false;
            }
            return true;
        });

        const total = rows.length;
        rows = rows.slice(skip, skip + limit);

        const items = rows.map((c: any) => {
            const p = c.product.toObject ? c.product.toObject() : c.product;
            return {
                ...p,
                preorder: {
                    configId: c._id,
                    sameDay: c.sameDay,
                    scheduled: c.scheduled,
                },
            };
        });

        return { items, total };
    }

    async getProductsByIds(ids: string[]) {
        return ProductModel.find({ _id: { $in: ids }, isActive: true });
    }

    // ---------------- Customer order ----------------

    async createOrder(data: Partial<IPreorderOrder>) {
        return PreorderOrderModel.create(data);
    }

    async findOrderById(id: string) {
        return PreorderOrderModel.findOne({ _id: id, isActive: true })
            .populate("user", "firstName lastName mobileNumber email")
            .populate("vendor", "firstName lastName mobileNumber")
            .populate("driver", "firstName lastName mobileNumber");
    }

    async findByUser(userId: string, page = 1, limit = 10, status?: string) {
        const skip = (page - 1) * limit;
        const query: any = { user: userId, isActive: true };
        if (status) query.status = status;

        const [items, total] = await Promise.all([
            PreorderOrderModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("vendor", "firstName lastName"),
            PreorderOrderModel.countDocuments(query),
        ]);

        return { items, total, page, limit };
    }

    async findByVendor(
        vendorId: string,
        page = 1,
        limit = 10,
        status?: string
    ) {
        const skip = (page - 1) * limit;
        // Sellers only ever see paid preorders (never pending_payment).
        const query: any = {
            vendor: vendorId,
            isActive: true,
            paymentStatus: "success",
        };
        if (status) query.status = status;

        const [items, total] = await Promise.all([
            PreorderOrderModel.find(query)
                .sort({
                    "scheduled.date": 1,
                    "sameDay.promisedReadyAt": 1,
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limit)
                .populate("user", "firstName lastName mobileNumber"),
            PreorderOrderModel.countDocuments(query),
        ]);

        return { items, total, page, limit };
    }

    async updateOrderById(id: string, data: Partial<IPreorderOrder>) {
        return PreorderOrderModel.findByIdAndUpdate(id, data, { new: true });
    }

    async pushTrackingAndSet(
        id: string,
        set: Record<string, any>,
        tracking: Record<string, any>
    ) {
        return PreorderOrderModel.findByIdAndUpdate(
            id,
            {
                $set: set,
                $push: { trackingHistory: tracking },
            },
            { new: true }
        );
    }
}
