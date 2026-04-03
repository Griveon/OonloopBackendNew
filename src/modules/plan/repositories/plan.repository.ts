import { PlanModel } from "../models/plan.model.js";
import type { IPlan } from "../interfaces/plan.interface.js";
import { PlanFeatureModel } from "../../planfeature/models/planfeature.model.js";

export class PlanRepository {

    async createPlan(data: Partial<IPlan>) {
        return await PlanModel.create(data);
    }

    async findByName(name: string) {
        return await PlanModel.findOne({ name });
    }

    async findById(id: string) {
        return await PlanModel.findById(id);
    }

    async findAll() {
        return await PlanModel.find({ isActive: true })
            .populate({
                path: "currency",
                select: "code symbol name",
            });
    }
    async getPlansWithFeatures() {
        return await PlanModel.aggregate([
            { $match: { isActive: true } },

            {
                $lookup: {
                    from: "planfeatures",
                    localField: "_id",
                    foreignField: "plan",
                    as: "featuresData",
                },
            },

            {
                $lookup: {
                    from: "features",
                    localField: "featuresData.feature",
                    foreignField: "_id",
                    as: "allFeatures",
                },
            },

            {
                $project: {
                    name: 1,
                    displayName: 1,
                    description: 1,
                    price: 1,
                    billingCycle: 1,
                    currency: 1,
                    features: {
                        $map: {
                            input: "$featuresData",
                            as: "fd",
                            in: {
                                _id: "$$fd.feature",
                                name: {
                                    $arrayElemAt: [
                                        {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: "$allFeatures",
                                                        cond: { $eq: ["$$this._id", "$$fd.feature"] },
                                                    },
                                                },
                                                as: "f",
                                                in: "$$f.name",
                                            },
                                        },
                                        0,
                                    ],
                                },
                                description: {
                                    $arrayElemAt: [
                                        {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: "$allFeatures",
                                                        cond: { $eq: ["$$this._id", "$$fd.feature"] },
                                                    },
                                                },
                                                as: "f",
                                                in: "$$f.description",
                                            },
                                        },
                                        0,
                                    ],
                                },
                                value: "$$fd.value",
                                type: "$$fd.featureType",
                            },
                        },
                    },
                },
            },
        ]);
    }

    async findAllQuery(page: number, limit: number, search = "") {
        const skip = (page - 1) * limit;

        const filter = {
            isActive: true,
            $or: [
                { name: { $regex: search, $options: "i" } },
                { displayName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { billingCycle: { $regex: search, $options: "i" } },
            ],
        };

        const [plans, total] = await Promise.all([
            PlanModel.find(filter)
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "currency",
                    select: "code symbol name",
                }),
            PlanModel.countDocuments(filter),
        ]);

        return { plans, total };
    }

    async updatePlan(id: string, data: Partial<IPlan>) {
        return await PlanModel.findByIdAndUpdate(id, data, { new: true });
    }

    async deactivatePlan(id: string) {
        return await PlanModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
    }

    async activatePlan(id: string) {
        return await PlanModel.findByIdAndUpdate(id, { isActive: true }, { new: true });
    }
}