import { Types } from "mongoose";
import { OrderModel } from "../models/order.model.js";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";

export class AdminOrderStatusRepository {
    async findParentOrderById(orderId: string) {
        if (!Types.ObjectId.isValid(orderId)) return null;

        return await OrderModel.findOne({
            _id: orderId,
            isActive: true,
        });
    }

    async findVendorOrderById(vendorOrderId: string) {
        if (!Types.ObjectId.isValid(vendorOrderId)) return null;

        return await OrderVendorModel.findOne({
            _id: vendorOrderId,
            isActive: true,
        });
    }

    async findVendorOrderForUpdate(vendorOrderId: string) {
        if (!Types.ObjectId.isValid(vendorOrderId)) return null;

        return await OrderVendorModel.findOne({
            _id: vendorOrderId,
            isActive: true,
        }).select("+pickupVerification.pickupOtp +pickupVerification.pickupQrCode");
    }

    async findActiveVendorOrdersByParentOrder(parentOrderId: string) {
        if (!Types.ObjectId.isValid(parentOrderId)) return [];

        return await OrderVendorModel.find({
            parentOrder: parentOrderId,
            isActive: true,
        }).sort({ createdAt: 1 });
    }

    async updateParentOrder(orderId: string, updateData: any) {
        if (!Types.ObjectId.isValid(orderId)) return null;

        return await OrderModel.findOneAndUpdate(
            { _id: orderId, isActive: true },
            updateData,
            { new: true, runValidators: true }
        );
    }

    async updateVendorOrder(vendorOrderId: string, updateData: any) {
        if (!Types.ObjectId.isValid(vendorOrderId)) return null;

        return await OrderVendorModel.findOneAndUpdate(
            { _id: vendorOrderId, isActive: true },
            updateData,
            { new: true, runValidators: true }
        );
    }

    async getAdminOrderDetail(orderId: string) {
        if (!Types.ObjectId.isValid(orderId)) return null;

        const order = await OrderModel.findOne({
            _id: orderId,
            isActive: true,
        })
            .populate("user")
            .populate("vendor")
            .populate("vendors")
            .populate("items.product")
            .populate("paymentMethod")
            .populate("paymentTransaction")
            .lean();

        if (!order) return null;

        const vendorOrders = await OrderVendorModel.find({
            parentOrder: orderId,
            isActive: true,
        })
            .populate("vendor")
            .populate("driver")
            .populate("items.product")
            .populate("paymentMethod")
            .populate("paymentTransaction")
            .sort({ createdAt: 1 })
            .lean();

        return {
            ...order,
            vendorOrders,
        };
    }
}
