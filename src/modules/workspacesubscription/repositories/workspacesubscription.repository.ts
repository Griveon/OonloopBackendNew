import type { IWorkspaceSubscriptionDocument } from "../interfaces/workspacesubscription.interface.js";
import { WorkspaceSubscriptionModel } from "../models/workspacesubscription.model.js";

export class WorkspaceSubscriptionRepository {

    async create(data: Partial<IWorkspaceSubscriptionDocument>) {
        return await WorkspaceSubscriptionModel.create(data);
    }

    async findActiveByWorkspace(workspace: string) {
        return await WorkspaceSubscriptionModel.findOne({
            workspace,
            status: "active",
            isActive: true,
        }).populate("workspace plan user");
    }

    async findActiveByUser(user: string) {
        return await WorkspaceSubscriptionModel.findOne({
            user,
            status: "active",
            isActive: true,
        }).populate("workspace plan user");
    }

    async findById(id: string) {
        return await WorkspaceSubscriptionModel.findById(id)
            .populate("workspace plan user");
    }

    async findAll(page = 1, limit = 10, search = "") {
        const filter: any = {};

        if (search) {
            filter.$or = [
                { status: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;

        const [subscriptions, total] = await Promise.all([
            WorkspaceSubscriptionModel.find(filter)
                .populate("workspace plan user")
                .skip(skip)
                .limit(limit),
            WorkspaceSubscriptionModel.countDocuments(filter),
        ]);

        return { subscriptions, total };
    }

    async update(id: string, data: Partial<IWorkspaceSubscriptionDocument>) {
        return await WorkspaceSubscriptionModel.findByIdAndUpdate(
            id,
            data,
            { new: true }
        ).populate("workspace plan user");
    }

    async cancel(id: string) {
        return await WorkspaceSubscriptionModel.findByIdAndUpdate(
            id,
            { status: "cancelled", isActive: false },
            { new: true }
        ).populate("workspace plan user");
    }

    async expire(id: string) {
        return await WorkspaceSubscriptionModel.findByIdAndUpdate(
            id,
            { status: "expired", isActive: false },
            { new: true }
        ).populate("workspace plan user");
    }

    async activate(id: string) {
        return await WorkspaceSubscriptionModel.findByIdAndUpdate(
            id,
            { status: "active", isActive: true },
            { new: true }
        ).populate("workspace plan user");
    }

    async delete(id: string) {
        return await WorkspaceSubscriptionModel.findByIdAndDelete(id);
    }

    async findValidByWorkspace(workspace: string) {
        const now = new Date();

        return await WorkspaceSubscriptionModel.findOne({
            workspace,
            status: "active",
            isActive: true,
            endDate: { $gte: now },
        }).populate("workspace plan user");
    }
}