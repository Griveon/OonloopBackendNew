import { PaymentTransactionModel } from "../models/paymenttransaction.model.js";
import type { IPaymentTransaction } from "../interfaces/paymenttransaction.interface.js";
import { OrderModel } from "../../order/models/order.model.js";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";
import { PersonalShopperBookingModel } from "../../personalshopper/models/personalshopper.model.js";
import { PreorderOrderModel } from "../../preorder/models/preorderorder.model.js";

export class PaymentTransactionRepository {

    async create(data: Partial<IPaymentTransaction>) {
        return await PaymentTransactionModel.create(data);
    }

    async findAll() {
        return await PaymentTransactionModel.find({ isActive: true })
            .sort({ createdAt: -1 });
    }

    async findById(id: string) {
        return await PaymentTransactionModel.findOne({
            _id: id,
            isActive: true,
        });
    }

    async findOrderById(id: string) {
        return await OrderModel.findOne({
            _id: id,
            isActive: true,
        });
    }

    async update(id: string, data: Partial<IPaymentTransaction>) {
        return await PaymentTransactionModel.findByIdAndUpdate(
            id,
            data,
            { new: true }
        );
    }

    async markSuccess(id: string, externalPaymentId?: string) {
        return await PaymentTransactionModel.findByIdAndUpdate(
            id,
            {
                status: "success",
                externalPaymentId,
                paidAt: new Date(),
            },
            { new: true }
        );
    }

    async markFailed(id: string) {
        return await PaymentTransactionModel.findByIdAndUpdate(
            id,
            {
                status: "failed",
                failedAt: new Date(),
            },
            { new: true }
        );
    }

    async cancel(id: string) {
        return await PaymentTransactionModel.findByIdAndUpdate(
            id,
            { status: "cancelled" },
            { new: true }
        );
    }

    async markOrderPaid(orderId: string, transactionId: string) {
        const paidAt = new Date();

        const updatedOrder = await OrderModel.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    paymentTransaction: transactionId,
                    paymentStatus: "success",
                    status: "placed",
                    updatedAt: paidAt,
                },
                $push: {
                    trackingHistory: {
                        title: "Payment successful",
                        status: "placed",
                        remark: "Payment successful and order placed",
                        updatedByRole: "system",
                        updatedAt: paidAt,
                    },
                },
            },
            { new: true }
        );

        await OrderVendorModel.updateMany(
            {
                parentOrder: orderId,
                isActive: true,
            },
            {
                $set: {
                    paymentTransaction: transactionId,
                    paymentStatus: "success",
                    status: "placed",
                    updatedAt: paidAt,
                },
                $push: {
                    trackingHistory: {
                        title: "Payment successful",
                        status: "placed",
                        remark: "Payment successful and vendor order placed",
                        updatedByRole: "system",
                        updatedAt: paidAt,
                    },
                },
            }
        );

        return updatedOrder;
    }

    async markOrderFailed(orderId: string) {
        const failedAt = new Date();

        const updatedOrder = await OrderModel.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    status: "cancelled",
                    paymentStatus: "failed",
                    updatedAt: failedAt,
                },
                $push: {
                    trackingHistory: {
                        title: "Payment failed",
                        status: "cancelled",
                        remark: "Payment failed and order cancelled",
                        updatedByRole: "system",
                        updatedAt: failedAt,
                    },
                },
            },
            { new: true }
        );

        await OrderVendorModel.updateMany(
            {
                parentOrder: orderId,
                isActive: true,
            },
            {
                $set: {
                    status: "cancelled",
                    paymentStatus: "failed",
                    updatedAt: failedAt,
                },
                $push: {
                    trackingHistory: {
                        title: "Payment failed",
                        status: "cancelled",
                        remark: "Payment failed and vendor order cancelled",
                        updatedByRole: "system",
                        updatedAt: failedAt,
                    },
                },
            }
        );

        return updatedOrder;
    }

    // ----- Personal Shopper booking -----
    async findBookingById(id: string) {
        return await PersonalShopperBookingModel.findOne({
            _id: id,
            isActive: true,
        });
    }

    async markBookingPaid(bookingId: string, transactionId: string) {
        return await PersonalShopperBookingModel.findByIdAndUpdate(
            bookingId,
            {
                paymentTransaction: transactionId,
                paymentStatus: "paid",
                status: "confirmed",
            },
            { new: true }
        );
    }

    // ----- Preorder -----
    async findPreorderById(id: string) {
        return await PreorderOrderModel.findOne({
            _id: id,
            isActive: true,
        });
    }

    async markPreorderPaid(preorderId: string, transactionId: string) {
        const paidAt = new Date();
        return await PreorderOrderModel.findByIdAndUpdate(
            preorderId,
            {
                $set: {
                    paymentTransaction: transactionId,
                    paymentStatus: "success",
                    status: "placed",
                    placedAt: paidAt,
                },
                $push: {
                    trackingHistory: {
                        title: "Payment successful",
                        status: "placed",
                        remark: "Payment successful and preorder placed",
                        updatedByRole: "system",
                        updatedAt: paidAt,
                    },
                },
            },
            { new: true }
        );
    }
}