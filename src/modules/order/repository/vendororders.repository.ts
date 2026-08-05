import mongoose from "mongoose";
import { OrderModel } from "../models/order.model.js";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";

export class VendorOrderRepository {
    async findByVendor(
        vendorId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        const skip = (page - 1) * limit;

        const query: any = {
            vendor: vendorId,
            isActive: true,
            paymentStatus: "success",
        };

        if (filter.status) {
            query.status = filter.status;
        }

        if (filter.sellerStatus) {
            query.sellerStatus = filter.sellerStatus;
        }

        if (filter.deliveryStatus) {
            query.deliveryStatus = filter.deliveryStatus;
        }

        if (filter.paymentStatus) {
            query.paymentStatus = filter.paymentStatus;
        }

        if (filter.orderNumber) {
            query.$or = [
                {
                    orderNumber: {
                        $regex: filter.orderNumber,
                        $options: "i",
                    },
                },
                {
                    vendorOrderNumber: {
                        $regex: filter.orderNumber,
                        $options: "i",
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            OrderVendorModel.find(query)
                .populate(
                    "user",
                    "firstName lastName mobileNumber"
                )
                .populate(
                    "vendor",
                    "firstName lastName mobileNumber shopName businessName"
                )
                .populate("driver")
                .populate("parentOrder")
                .populate("paymentMethod")
                .populate("paymentTransaction")
                .populate("items.product")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            OrderVendorModel.countDocuments(query),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }

    async findVendorOrderById(
        orderId: string,
        vendorId: string,
    ) {
        const query: any = {
            vendor: vendorId,
            // isActive: true,
            paymentStatus: "success",
        };

        if (mongoose.Types.ObjectId.isValid(orderId)) {
            query.$or = [
                { _id: orderId },
                { parentOrder: orderId },
            ];
        } else {
            query.$or = [
                { orderNumber: orderId },
                { vendorOrderNumber: orderId },
            ];
        }

        return await OrderVendorModel.findOne(query);
    }

    async findVendorOrderWithPickupOtp(
        orderId: string,
        vendorId: string
    ) {
        const query: any = {
            vendor: vendorId,
            isActive: true,
        };

        /**
         * Supports:
         * 1. OrderVendor _id
         * 2. Parent Order _id
         * 3. orderNumber
         * 4. vendorOrderNumber
         */
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            query.$or = [
                { _id: orderId },
                { parentOrder: orderId },
            ];
        } else {
            query.$or = [
                { orderNumber: orderId },
                { vendorOrderNumber: orderId },
            ];
        }

        return await OrderVendorModel.findOne(query)
            .select(
                "+pickupVerification.pickupOtp +pickupVerification.pickupQrCode"
            )
            .populate(
                "user",
                "firstName lastName mobileNumber"
            )
            .populate(
                "vendor",
                "firstName lastName mobileNumber shopName businessName"
            )
            .populate("driver")
            .populate("parentOrder");
    }

    async updateVendorPickupOtp(
        orderId: any,
        pickupOtp: string,
        pickupQrCode: string
    ) {
        return await OrderVendorModel.findOneAndUpdate(
            {
                _id: orderId,
                isActive: true,
            },
            {
                $set: {
                    "pickupVerification.pickupOtp": pickupOtp,
                    "pickupVerification.pickupQrCode": pickupQrCode,
                    "pickupVerification.otpVerified": false,
                    "pickupVerification.qrVerified": false,
                },
                $push: {
                    trackingHistory: {
                        title: "Pickup OTP generated",
                        status: "ready_for_pickup",
                        remark: "Pickup OTP generated for seller handover",
                        updatedByRole: "system",
                        updatedAt: new Date(),
                    },
                },
            },
            {
                new: true,
                runValidators: true,
            }
        ).select(
            "+pickupVerification.pickupOtp +pickupVerification.pickupQrCode"
        );
    }

    async updateOrderStatus(
        orderId: string,
        vendorId: string,
        updateData: any
    ) {
        const query: any = {
            vendor: vendorId,
            isActive: true,
        };

        if (mongoose.Types.ObjectId.isValid(orderId)) {
            query.$or = [
                { _id: orderId },
                { parentOrder: orderId },
            ];
        } else {
            query.$or = [
                { orderNumber: orderId },
                { vendorOrderNumber: orderId },
            ];
        }

        return await OrderVendorModel.findOneAndUpdate(
            query,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        )
            .populate(
                "user",
                "firstName lastName mobileNumber"
            )
            .populate(
                "vendor",
                "firstName lastName mobileNumber shopName businessName"
            )
            .populate("driver")
            .populate("parentOrder")
            .populate("paymentMethod")
            .populate("paymentTransaction")
            .populate("items.product");
    }

    async findActiveVendorOrdersByParentOrder(parentOrderId: any) {
        return await OrderVendorModel.find({
            parentOrder: parentOrderId,
            isActive: true,
        }).select(
            "_id parentOrder status sellerStatus deliveryStatus isActive"
        );
    }

    async updateParentOrderStatus(
        parentOrderId: any,
        status: string,
        remark: string
    ) {
        return await OrderModel.findOneAndUpdate(
            {
                _id: parentOrderId,
                isActive: true,
            },
            {
                $set: {
                    status,
                },
                $push: {
                    trackingHistory: {
                        title: "Parent order status synced",
                        status,
                        remark,
                        updatedByRole: "system",
                        updatedAt: new Date(),
                    },
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );
    }

}