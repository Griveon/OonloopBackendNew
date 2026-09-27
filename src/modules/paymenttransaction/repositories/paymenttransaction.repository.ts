import { PaymentTransactionModel } from "../models/paymenttransaction.model.js";
import type { IPaymentTransaction } from "../interfaces/paymenttransaction.interface.js";
import { OrderModel } from "../../order/models/order.model.js";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";
import { PersonalShopperBookingModel } from "../../personalshopper/models/personalshopper.model.js";
import { PreorderOrderModel } from "../../preorder/models/preorderorder.model.js";
import { BuyForMeRequestModel } from "../../buyforme/models/buyforme.model.js";

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

    async findByExternalOrderId(externalOrderId: string) {
        return await PaymentTransactionModel.findOne({
            externalOrderId,
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
        const update: any = {
            status: "success",
            paidAt: new Date(),
        };

        if (externalPaymentId) {
            update.externalPaymentId = externalPaymentId;
        }

        const updated = await PaymentTransactionModel.findOneAndUpdate(
            {
                _id: id,
                isActive: true,
                status: { $ne: "success" },
            },
            {
                $set: update,
                $unset: { failedAt: 1 },
            },
            { new: true }
        );

        // Keep the old method contract: return the transaction even when it was
        // already successful and no update was required.
        return updated || await this.findById(id);
    }

    async markFailed(id: string) {
        const updated = await PaymentTransactionModel.findOneAndUpdate(
            {
                _id: id,
                isActive: true,
                status: { $ne: "success" },
            },
            {
                $set: {
                    status: "failed",
                    failedAt: new Date(),
                },
            },
            { new: true }
        );

        return updated || await this.findById(id);
    }

    async cancel(id: string) {
        const updated = await PaymentTransactionModel.findOneAndUpdate(
            {
                _id: id,
                isActive: true,
                status: { $ne: "success" },
            },
            { $set: { status: "cancelled" } },
            { new: true }
        );

        return updated || await this.findById(id);
    }

    async markOrderPaid(orderId: string, transactionId: string) {
        const paidAt = new Date();

        // Update the parent order only once. This prevents duplicate tracking
        // entries when mobile verification and Razorpay webhook arrive together.
        const updatedOrder = await OrderModel.findOneAndUpdate(
            {
                _id: orderId,
                isActive: true,
                paymentStatus: { $ne: "success" },
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
                        remark: "Payment successful and order placed",
                        updatedByRole: "system",
                        updatedAt: paidAt,
                    },
                },
            },
            { new: true }
        );

        // Same idempotent protection for vendor orders.
        await OrderVendorModel.updateMany(
            {
                parentOrder: orderId,
                isActive: true,
                paymentStatus: { $ne: "success" },
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

        return updatedOrder || await this.findOrderById(orderId);
    }

    async markOrderFailed(orderId: string) {
        const failedAt = new Date();

        // Never downgrade an already-paid order because a late/duplicate failed
        // event can arrive after another successful payment attempt.
        const updatedOrder = await OrderModel.findOneAndUpdate(
            {
                _id: orderId,
                isActive: true,
                paymentStatus: { $ne: "success" },
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
                paymentStatus: { $ne: "success" },
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

        return updatedOrder || await this.findOrderById(orderId);
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

    async findBuyForMeById(id: string) {
        return await BuyForMeRequestModel.findOne({
            _id: id,
            isActive: true,
        });
    }

    async markBuyForMePaid(requestId: string, transactionId: string) {
        return await BuyForMeRequestModel.findByIdAndUpdate(
            requestId,
            {
                paymentTransaction: transactionId,
                paymentStatus: "paid",
                status: "confirmed",
            },
            { new: true }
        );
    }
}
