// src/modules/order/repository/customerorders.repository.ts

import mongoose from "mongoose";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";

export class CustomerOrderRepository {
    async findCustomerOrderWithDeliveryOtp(
        orderId: string,
        userId: string
    ) {
        const query: any = {
            user: userId,
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
            .select("+customerVerification.deliveryOtp")
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
            .populate("items.product");
    }

    async updateCustomerDeliveryOtp(
        orderId: any,
        deliveryOtp: string
    ) {
        return await OrderVendorModel.findOneAndUpdate(
            {
                _id: orderId,
                isActive: true,
            },
            {
                $set: {
                    "customerVerification.deliveryOtp": deliveryOtp,
                    "customerVerification.otpVerified": false,
                },
                $push: {
                    trackingHistory: {
                        title: "Customer delivery OTP generated",
                        status: "customer_verification_pending",
                        remark: "Delivery OTP generated for customer verification",
                        updatedByRole: "system",
                        updatedAt: new Date(),
                    },
                },
            },
            {
                new: true,
                runValidators: true,
            }
        )
            .select("+customerVerification.deliveryOtp")
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
            .populate("items.product");
    }
}