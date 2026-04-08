import { UnitRepository } from "../repositories/unit.repository.js";
import type { IUnitDocument } from "../interfaces/unit.interface.js";

export class UnitService {
    private repo: UnitRepository;

    constructor() {
        this.repo = new UnitRepository();
    }

    async create(data: Partial<IUnitDocument>) {
        return await this.repo.create(data);
    }

    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const unit = await this.repo.findById(id);
        if (!unit) throw new Error("Unit not found");
        return unit;
    }

    async update(id: string, data: Partial<IUnitDocument>) {
        const unit = await this.repo.findById(id);
        if (!unit) throw new Error("Unit not found");
        return await this.repo.update(id, data);
    }

    async delete(id: string) {
        const unit = await this.repo.findById(id);
        if (!unit) throw new Error("Unit not found");
        return await this.repo.delete(id);
    }

    async activate(id: string) {
        const unit = await this.repo.findById(id);
        if (!unit) throw new Error("Unit not found");
        return await this.repo.activate(id);
    }

    async deactivate(id: string) {
        const unit = await this.repo.findById(id);
        if (!unit) throw new Error("Unit not found");
        return await this.repo.deactivate(id);
    }
}