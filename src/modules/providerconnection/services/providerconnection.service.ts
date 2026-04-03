import type { IProviderConnection } from "../interfaces/providerconnection.interface.js";
import { ProviderConnectionModel } from "../models/providerconnection.model.js";
import { ProviderConnectionRepository } from "../repositories/providerconnection.repository.js";

export class ProviderConnectionService {
    private repo: ProviderConnectionRepository;

    constructor() {
        this.repo = new ProviderConnectionRepository();
    }

    async createProviderConnection(data: any) {

        const existing = await this.repo.findByProvider(
            data.storeId,
            data.provider,
            data.environment || "test"
        );

        if (existing) {
            throw new Error(
                `${data.provider} already exists for ${data.environment} environment`
            );
        }

        const tempDoc = new ProviderConnectionModel();
        const encryptedCredentials: any = {};

        if (data.credentials) {
            for (const key in data.credentials) {
                encryptedCredentials[key] =
                    tempDoc.encryptValue(data.credentials[key]);
                    console.log(`Encrypted ${key}:`, encryptedCredentials[key]);
            }
        }

        let webhook = data.webhook;
        if (webhook?.secret) {
            webhook.secret = tempDoc.encryptValue(webhook.secret);
        }

        return await this.repo.create({
            ...data,
            credentials: encryptedCredentials,
            webhook,
        });
    }

    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Provider connection not found");
        return item;
    }

    async update(id: string, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Provider connection not found");

        const tempDoc = new ProviderConnectionModel();

        if (data.credentials) {
            const encrypted: any = {};
            for (const key in data.credentials) {
                encrypted[key] = tempDoc.encryptValue(data.credentials[key]);
            }
            data.credentials = encrypted;
        }

        if (data.webhook?.secret) {
            data.webhook.secret = tempDoc.encryptValue(data.webhook.secret);
        }

        return await this.repo.update(id, data);
    }

    async delete(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Provider connection not found");

        return await this.repo.softDelete(id);
    }

    async activate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Provider connection not found");

        return await this.repo.activate(id);
    }

    async deactivate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Provider connection not found");

        return await this.repo.deactivate(id);
    }
}