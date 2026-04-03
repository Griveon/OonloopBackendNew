import mongoose from "mongoose";
import { PlanFeatureModel } from "../../planfeature/models/planfeature.model.js";
import { WorkspaceSubscriptionRepository } from "../repositories/workspacesubscription.repository.js";
import { WorkspaceModel } from "../../workspace/models/workspace.model.js";
import { PlanModel } from "../../plan/models/plan.model.js";
import { UserModel } from "../../user/models/user.model.js";
// import { UserModel } from "../../user/models/user.model.js"; // optional

export class WorkspaceSubscriptionService {
    private subscriptionRepo: WorkspaceSubscriptionRepository;

    constructor() {
        this.subscriptionRepo = new WorkspaceSubscriptionRepository();
    }

    private validateObjectId(id: string, name: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid ${name}`);
        }
    }

    private async validateUser(user: string) {
        this.validateObjectId(user, "user ID");

        const userDoc = await UserModel.findById(user);
        if (!userDoc) throw new Error("User not found");

        return true;
    }

    private async validateWorkspace(workspace: string) {
        this.validateObjectId(workspace, "workspace ID");

        const workspaceDoc = await WorkspaceModel.findById(workspace);
        if (!workspaceDoc) throw new Error("Workspace not found");
        if (!workspaceDoc.isActive) throw new Error("Workspace is inactive");

        return workspaceDoc;
    }

    private async validatePlan(plan: string) {
        this.validateObjectId(plan, "plan ID");

        const planDoc = await PlanModel.findById(plan);
        if (!planDoc) throw new Error("Plan not found");
        if (!planDoc.isActive) throw new Error("Plan is inactive");

        return planDoc;
    }

    private async validateSubscription(id: string) {
        this.validateObjectId(id, "subscription ID");

        const sub = await this.subscriptionRepo.findById(id);
        if (!sub) throw new Error("Subscription not found");

        return sub;
    }

    // 🚀 Create Subscription
    async createSubscription(user: string, workspace: string, plan: string) {
        await this.validateUser(user);
        await this.validateWorkspace(workspace);
        await this.validatePlan(plan);

        const existing = await this.subscriptionRepo.findActiveByWorkspace(workspace);
        if (existing) {
            throw new Error("Active subscription already exists for this workspace");
        }

        const planFeatures = await PlanFeatureModel.find({ plan }).populate("feature");

        const features = planFeatures.map((pf: any) => ({
            key: pf?.feature?.key,
            value: pf?.value,
        }));

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        return await this.subscriptionRepo.create({
            user: new mongoose.Types.ObjectId(user),
            workspace: new mongoose.Types.ObjectId(workspace),
            plan: new mongoose.Types.ObjectId(plan),
            startDate,
            endDate,
            status: "active",
            isActive: true,
            autoRenew: true,
            features,
        });
    }

    // 📌 Get active subscription
    async getActiveSubscription(workspace: string) {
        await this.validateWorkspace(workspace);

        const sub = await this.subscriptionRepo.findValidByWorkspace(workspace);
        if (!sub) throw new Error("No active subscription found");

        return sub;
    }

    // 🔄 Change Plan
    async changePlan(workspace: string, newPlan: string) {
        await this.validateWorkspace(workspace);
        await this.validatePlan(newPlan);

        const existing = await this.subscriptionRepo.findActiveByWorkspace(workspace);

        if (!existing) {
            throw new Error("No active subscription to change");
        }

        if (existing.plan.toString() === newPlan) {
            throw new Error("Already subscribed to this plan");
        }

        await this.subscriptionRepo.expire(existing._id.toString());

        return await this.createSubscription(
            existing.user.toString(),
            workspace,
            newPlan
        );
    }

    // ❌ Cancel subscription
    async cancelSubscription(workspace: string) {
        await this.validateWorkspace(workspace);

        const sub = await this.subscriptionRepo.findActiveByWorkspace(workspace);
        if (!sub) throw new Error("No active subscription found");

        return await this.subscriptionRepo.cancel(sub._id.toString());
    }

    // 🔁 Activate subscription
    async activateSubscription(id: string) {
        const sub = await this.validateSubscription(id);

        if (sub.isActive) {
            throw new Error("Subscription already active");
        }

        if (sub.status === "expired") {
            throw new Error("Cannot activate expired subscription");
        }

        return await this.subscriptionRepo.activate(id);
    }

    // 🔍 Get by ID
    async getSubscriptionById(id: string) {
        return await this.validateSubscription(id);
    }

    // 📄 Get all
    async getAllSubscriptions(options: { page?: number; limit?: number; search?: string } = {}) {
        const { page = 1, limit = 10, search = "" } = options;

        if (page < 1 || limit < 1) {
            throw new Error("Invalid pagination values");
        }

        return await this.subscriptionRepo.findAll(page, limit, search);
    }

    // 🗑 Delete
    async deleteSubscription(id: string) {
        const sub = await this.validateSubscription(id);

        if (sub.isActive) {
            throw new Error("Cannot delete active subscription");
        }

        return await this.subscriptionRepo.delete(id);
    }
}