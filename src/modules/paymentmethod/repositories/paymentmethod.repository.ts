import { PaymentMethodModel } from "../models/paymentmethod.model.js";
import type { IPaymentMethod } from "../interfaces/paymentmethod.interface.js";

export class PaymentMethodRepository {

    async create(data: Partial<IPaymentMethod>) {
        return await PaymentMethodModel.create(data);
    }

    async findAll() {
        return await PaymentMethodModel.find({
            isDeleted: false,
        }).sort({ priority: 1 });
    }

    async findById(id: string) {
        return await PaymentMethodModel.findOne({
            _id: id,
            isDeleted: false,
        });
    }

    async findByType(type: string) {
        return await PaymentMethodModel.findOne({
            type,
            isDeleted: false,
        } as any);
    }

    async update(id: string, data: Partial<IPaymentMethod>) {
        return await PaymentMethodModel.findByIdAndUpdate(
            id,
            data,
            { new: true }
        );
    }

    async softDelete(id: string) {
        return await PaymentMethodModel.findByIdAndUpdate(
            id,
            {
                isDeleted: true,
                deletedAt: new Date(),
            },
            { new: true }
        );
    }

    async activate(id: string) {
        return await PaymentMethodModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }

    async deactivate(id: string) {
        return await PaymentMethodModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }
}