import { PaymentTransactionModel } from "../models/paymenttransaction.model.js";
import type { IPaymentTransaction } from "../interfaces/paymenttransaction.interface.js";

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
}