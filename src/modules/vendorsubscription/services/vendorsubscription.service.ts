import { VendorSubscriptionRepository } from "../repositories/vendorsubscription.repository.js";
import { PlanModel } from "../../plan/models/plan.model.js";
import { PlanFeatureModel } from "../../planfeature/models/planfeature.model.js";

export class VendorSubscriptionService {
    private repo: VendorSubscriptionRepository;

    constructor() {
        this.repo = new VendorSubscriptionRepository();
    }

    async createSubscription(data: any) {

        // ✅ Prevent multiple active subscriptions
        const existing = await this.repo.findActiveByVendor(data.vendor);

        if (existing) {
            throw new Error("Vendor already has an active subscription");
        }

        // ✅ Fetch plan
        const plan = await PlanModel.findById(data.plan);
        if (!plan) throw new Error("Plan not found");

        // ✅ Fetch plan features
        const planFeatures = await PlanFeatureModel.find({
            plan: data.plan,
            isActive: true,
        });

        // ✅ Snapshot features
        const features = planFeatures.map((pf) => ({
            feature: pf.feature,
            value: pf.value,
        }));

        // ❌ Prevent manual injection
        delete data.features;

        return await this.repo.create({
            ...data,
            billingCycle: plan.billingCycle,
            features,
        });
    }

    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Subscription not found");
        return item;
    }

    async update(id: string, data: any) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Subscription not found");

        return await this.repo.update(id, data);
    }

    async delete(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Subscription not found");

        return await this.repo.softDelete(id);
    }

    async activate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Subscription not found");

        return await this.repo.activate(id);
    }

    async deactivate(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Subscription not found");

        return await this.repo.deactivate(id);
    }
}