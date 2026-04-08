import { VendorSubscriptionRepository } from "../repositories/vendorsubscription.repository.js";
import { PlanModel } from "../../plan/models/plan.model.js";
import { PlanFeatureModel } from "../../planfeature/models/planfeature.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";

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

        // ✅ Set dates
        const startDate = new Date();
        let endDate = new Date(startDate);

        switch (plan.billingCycle) {
            case "monthly":
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case "yearly":
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            default:
                throw new Error("Invalid billing cycle");
        }

        // ✅ Validate required user
        if (!data.user) {
            throw new Error("User is required");
        }

        return await this.repo.create({
            ...data,
            user: data.user,           // ✅ REQUIRED
            billingCycle: plan.billingCycle,
            startDate,                 // ✅ NOW
            endDate,                   // ✅ CALCULATED
            features,
        });
    }

    async getActiveSubscriptionByUser(userId: any) {
        console.log(userId)
        const vendor = await VendorProfileModel.findOne({ user: userId });
        // console.log(vendor)
        if (!vendor) return null;

        return await this.repo.findActiveByVendor(userId);
    }

    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Subscription not found");
        return item;
    }
    
    async getByUserId(id: string) {
        const item = await this.repo.findByUserId(id);
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

    async activate(id: any) {
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