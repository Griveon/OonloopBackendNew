import { PlatformCommissionRepository } from "../repositories/platformcommission.repository.js";

export class PlatformCommissionService {
    private repo: PlatformCommissionRepository;

    constructor() {
        this.repo = new PlatformCommissionRepository();
    }

    async createCommission(data: any) {

        // ✅ Prevent duplicate active commission
        const existing = await this.repo.findActive(data.storeId);

        if (existing) {
            throw new Error("Active commission already exists");
        }

        return await this.repo.create(data);
    }

    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Commission not found");
        return item;
    }

    async update(id: string, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Commission not found");

        return await this.repo.update(id, data);
    }

    async deactivate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Commission not found");

        return await this.repo.deactivate(id);
    }

    // 🔥 Core Logic
    calculateCommission(amount: number, commission: any) {
        let result = 0;

        if (commission.type === "percentage") {
            result = (amount * commission.value) / 100;
        } else {
            result = commission.value;
        }

        if (commission.minAmount) {
            result = Math.max(result, commission.minAmount);
        }

        if (commission.maxAmount) {
            result = Math.min(result, commission.maxAmount);
        }

        return result;
    }
}