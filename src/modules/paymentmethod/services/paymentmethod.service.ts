import { PaymentMethodRepository } from "../repositories/paymentmethod.repository.js";

export class PaymentMethodService {
    private repo: PaymentMethodRepository;

    constructor() {
        this.repo = new PaymentMethodRepository();
    }

    async createPaymentMethod(data: any) {

        // ✅ Only one COD / ONLINE per store
        const existing = await this.repo.findByType(
            data.type
        );

        if (existing) {
            throw new Error(
                `${data.type.toUpperCase()} already exists for this store`
            );
        }

        // ✅ COD should not have provider
        if (data.type === "cod") {
            data.providerConnectionId = undefined;
        }

        // ✅ ONLINE must have provider
        if (data.type === "online" && !data.providerConnectionId) {
            throw new Error("Provider connection is required for online payment");
        }

        return await this.repo.create(data);
    }

    async getAll() {
        const items = await this.repo.findAll();
        // Demo method is only listed when demo payments are enabled (dev).
        if (process.env.ALLOW_DEMO_PAYMENT === "true") return items;
        return items.filter((m: any) => !m.isDemo);
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Payment method not found");
        return item;
    }

    async update(id: string, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Payment method not found");

        // ✅ Handle type switch safely
        if (data.type === "cod") {
            data.providerConnectionId = undefined;
        }

        if (data.type === "online" && !data.providerConnectionId) {
            throw new Error("Provider connection is required for online payment");
        }

        return await this.repo.update(id, data);
    }

    async delete(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Payment method not found");

        return await this.repo.softDelete(id);
    }

    async activate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Payment method not found");

        return await this.repo.activate(id);
    }

    async deactivate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Payment method not found");

        return await this.repo.deactivate(id);
    }
}