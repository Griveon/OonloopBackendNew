import type { IPlan } from "../interfaces/plan.interface.js";
import { PlanRepository } from "../repositories/plan.repository.js";

export class PlanService {
    private planRepository: PlanRepository;

    constructor() {
        this.planRepository = new PlanRepository();
    }

    async createPlan(data: IPlan) {
        const existingPlan = await this.planRepository.findByName(data.name);
        if (existingPlan) {
            throw new Error(`Plan with name "${data.name}" already exists`);
        }
        return await this.planRepository.createPlan(data);
    }

    async getAllPlans() {
        return await this.planRepository.findAll();
    }

    async getAllPlansWithFeatures() {
        return await this.planRepository.getPlansWithFeatures();
    }

    async getAllPlansWithQuery(page = 1, limit = 10, search = "") {
        return await this.planRepository.findAllQuery(page, limit, search);
    }

    async getPlanById(planId: string) {
        const plan = await this.planRepository.findById(planId);
        if (!plan) throw new Error("Plan not found");
        return plan;
    }

    async updatePlan(planId: string, data: Partial<IPlan>) {
        const plan = await this.planRepository.findById(planId);
        if (!plan) throw new Error("Plan not found");

        if (data.name) {
            const existingPlan = await this.planRepository.findByName(data.name);
            if (existingPlan && existingPlan._id.toString() !== planId) {
                throw new Error(`Plan with name "${data.name}" already exists`);
            }
        }

        return await this.planRepository.updatePlan(planId, data);
    }

    async deactivatePlan(planId: string) {
        const plan = await this.planRepository.findById(planId);
        if (!plan) throw new Error("Plan not found");
        return await this.planRepository.deactivatePlan(planId);
    }

    async activatePlan(planId: string) {
        const plan = await this.planRepository.findById(planId);
        if (!plan) throw new Error("Plan not found");
        return await this.planRepository.activatePlan(planId);
    }
}