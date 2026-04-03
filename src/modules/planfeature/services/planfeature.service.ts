import { FeatureModel } from "../../feature/models/feature.model.js";
import { PlanModel } from "../../plan/models/plan.model.js";
import type { IPlanFeature } from "../../planfeature/interfaces/planfeature.interface.js";
import { PlanFeatureRepository } from "../../planfeature/repositories/planfeature.repository.js";

export class PlanFeatureService {
    private planFeatureRepo: PlanFeatureRepository;

    constructor() {
        this.planFeatureRepo = new PlanFeatureRepository();
    }

    async createPlanFeature(data: IPlanFeature) {
        // Validate plan
        const plan = await PlanModel.findById(data.plan);
        if (!plan || !plan.isActive) throw new Error("Plan not found or inactive");

        // Validate feature
        const feature = await FeatureModel.findOne({ _id: data.feature, isActive: true });
        if (!feature) throw new Error("Feature not found or inactive");

        // Check if combination exists
        const existing = await this.planFeatureRepo.findByPlanAndFeature(data.plan, data.feature);
        if (existing) throw new Error("Feature already exists for this plan");

        return await this.planFeatureRepo.create(data);
    }

    async updatePlanFeature(id: string, data: Partial<IPlanFeature>) {
        const planFeature = await this.planFeatureRepo.findById(id);
        if (!planFeature) throw new Error("Plan feature not found");

        if (data.plan) {
            const plan = await PlanModel.findById(data.plan);
            if (!plan || !plan.isActive) throw new Error("Plan not found or inactive");
        }

        if (data.feature) {
            const feature = await FeatureModel.findOne({ _id: data.feature, isActive: true });
            if (!feature) throw new Error("Feature not found or inactive");
        }

        if (data.plan && data.feature) {
            const existing = await this.planFeatureRepo.findByPlanAndFeature(data.plan, data.feature);
            if (existing && existing._id.toString() !== id) {
                throw new Error("Feature already exists for this plan");
            }
        }

        return await this.planFeatureRepo.update(id, data);
    }

    async getAllFeaturesByPlan(planId: string, options: { page?: number; limit?: number; search?: string } = {}) {
        const { page = 1, limit = 10, search = "" } = options;
        return await this.planFeatureRepo.findAllByPlan(planId, page, limit, search);
    }

    async getPlanFeatureById(id: string) {
        const planFeature = await this.planFeatureRepo.findById(id);
        if (!planFeature) throw new Error("Plan feature not found");
        return planFeature;
    }

    async deletePlanFeature(id: string) {
        const planFeature = await this.planFeatureRepo.findById(id);
        if (!planFeature) throw new Error("Plan feature not found");
        return await this.planFeatureRepo.delete(id);
    }

    async deactivatePlanFeature(id: string) {
        const planFeature = await this.planFeatureRepo.findById(id);
        if (!planFeature) throw new Error("Plan feature not found");

        return await this.planFeatureRepo.deactivatePlanFeature(id);
    }

    async activatePlanFeature(id: string) {
        const planFeature = await this.planFeatureRepo.findById(id);
        if (!planFeature) throw new Error("Plan feature not found");

        // ✅ Check if parent plan is active
        const plan = await PlanModel.findById(planFeature.plan._id);
        if (!plan || !plan.isActive) throw new Error("Cannot activate feature: parent plan is inactive");

        return await this.planFeatureRepo.activatePlanFeature(id);
    }
}