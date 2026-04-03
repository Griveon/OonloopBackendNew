import { PlanFeatureModel } from "../models/planfeature.model.js";
import type { IPlanFeature } from "../interfaces/planfeature.interface.js";
import type { Types } from "mongoose";

export class PlanFeatureRepository {
    async create(data: Partial<IPlanFeature>) {
        return await PlanFeatureModel.create(data);
    }

    async findByPlanAndFeature(planId: Types.ObjectId, featureId: Types.ObjectId) {
        return await PlanFeatureModel.findOne({ plan: planId, feature: featureId })
            .populate("plan")
            .populate("feature");
    }

    async findById(id: string) {
        return await PlanFeatureModel.findById(id)
            .populate("plan")    // populate plan data
            .populate("feature"); // populate feature data
    }

    async findAllByPlan(
        planId: string,
        page = 1,
        limit = 10,
        search = ""
    ) {
        const filter: any = { plan: planId };

        if (search) {
            filter.$or = [
                { "feature.name": { $regex: search, $options: "i" } },
                { "feature.key": { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;

        const [features, total] = await Promise.all([
            PlanFeatureModel.find(filter)
                .populate("plan")    // populate plan data
                .populate("feature") // populate feature data
                .skip(skip)
                .limit(limit),
            PlanFeatureModel.countDocuments(filter),
        ]);

        return { features, total };
    }

    async update(id: string, data: Partial<IPlanFeature>) {
        return await PlanFeatureModel.findByIdAndUpdate(id, data, { new: true })
            .populate("plan")
            .populate("feature");
    }

    async delete(id: string) {
        return await PlanFeatureModel.findByIdAndDelete(id);
    }

    async deactivatePlanFeature(id: string) {
        return await PlanFeatureModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        )
            .populate("plan")
            .populate("feature");
    }

    async activatePlanFeature(id: string) {
        return await PlanFeatureModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        )
            .populate("plan")
            .populate("feature");
    }

}