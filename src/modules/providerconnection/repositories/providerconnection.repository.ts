import { ProviderConnectionModel } from "../models/providerconnection.model.js";
import type { IProviderConnection } from "../interfaces/providerconnection.interface.js";

export class ProviderConnectionRepository {

    async create(data: Partial<IProviderConnection>) {
        return await ProviderConnectionModel.create(data);
    }

    async findAll(storeId: string) {
        return await ProviderConnectionModel.find({
            storeId,
            isDeleted: false,
        }).sort({ priority: 1 });
    }

    async findById(id: string) {
        return await ProviderConnectionModel.findOne({
            _id: id,
            isDeleted: false,
        });
    }

    async findByProvider(storeId: string, provider: string, environment: string) {
        return await ProviderConnectionModel.findOne({
            storeId,
            provider,
            environment,
            isDeleted: false,
        });
    }

    async update(id: string, data: Partial<IProviderConnection>) {
        return await ProviderConnectionModel.findByIdAndUpdate(
            id,
            data,
            { new: true }
        );
    }

    async softDelete(id: string) {
        return await ProviderConnectionModel.findByIdAndUpdate(
            id,
            {
                isDeleted: true,
                deletedAt: new Date(),
            },
            { new: true }
        );
    }

    async activate(id: string) {
        return await ProviderConnectionModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }

    async deactivate(id: string) {
        return await ProviderConnectionModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }
}