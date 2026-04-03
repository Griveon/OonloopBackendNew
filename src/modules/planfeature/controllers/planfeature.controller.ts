import type { Request, Response } from "express";
import { PlanFeatureService } from "../services/planfeature.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class PlanFeatureController {
    private planFeatureService: PlanFeatureService;

    constructor() {
        this.planFeatureService = new PlanFeatureService();
    }

    // Create a new Plan Feature
    createPlanFeature = async (req: Request, res: Response) => {
        try {
            const feature = await this.planFeatureService.createPlanFeature(req.body);
            return res
                .status(201)
                .json(ResponseUtil.created("Plan feature created successfully", feature));
        } catch (error: any) {
            console.error(error);
            return res
                .status(400)
                .json(
                    ResponseUtil.badRequest(
                        typeof error.message === "string" ? error.message : "Bad request"
                    )
                );
        }
    };

    // Get all Plan Features with optional search and pagination
    getAllFeaturesByPlan = async (req: Request, res: Response) => {
        try {
            const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;
            const page = parseInt((req.query.page as string) || "1", 10);
            const limit = parseInt((req.query.limit as string) || "10", 10);
            const search = (req.query.search as string) || "";

            if (!planId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Plan ID is required"));
            }

            const { features, total } = await this.planFeatureService.getAllFeaturesByPlan(planId, {
                page,
                limit,
                search,
            });

            return res
                .status(200)
                .json(ResponseUtil.paginated("Plan features fetched successfully", features, page, limit, total));
        } catch (error: any) {
            console.error(error);
            return res
                .status(500)
                .json(
                    ResponseUtil.serverError(
                        typeof error.message === "string" ? error.message : "Internal server error",
                        error
                    )
                );
        }
    };

    // Get Plan Feature by ID
    getPlanFeatureById = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Plan feature ID is required"));
            }

            const feature = await this.planFeatureService.getPlanFeatureById(id);
            return res
                .status(200)
                .json(ResponseUtil.success("Plan feature fetched successfully", feature));
        } catch (error: any) {
            console.error(error);
            return res
                .status(404)
                .json(
                    ResponseUtil.notFound(
                        typeof error.message === "string" ? error.message : "Plan feature not found"
                    )
                );
        }
    };

    // Update Plan Feature
    updatePlanFeature = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Plan feature ID is required"));
            }

            const updatedFeature = await this.planFeatureService.updatePlanFeature(id, req.body);
            return res
                .status(200)
                .json(ResponseUtil.success("Plan feature updated successfully", updatedFeature));
        } catch (error: any) {
            console.error(error);
            return res
                .status(400)
                .json(
                    ResponseUtil.badRequest(
                        typeof error.message === "string" ? error.message : "Bad request"
                    )
                );
        }
    };

    // Delete Plan Feature
    deletePlanFeature = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Plan feature ID is required"));
            }

            await this.planFeatureService.deletePlanFeature(id);
            return res
                .status(200)
                .json(ResponseUtil.success("Plan feature deleted successfully", {}));
        } catch (error: any) {
            console.error(error);
            return res
                .status(404)
                .json(
                    ResponseUtil.notFound(
                        typeof error.message === "string" ? error.message : "Plan feature not found"
                    )
                );
        }
    };

    // Deactivate
    deactivatePlanFeature = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Plan feature ID is required"));

            const feature = await this.planFeatureService.deactivatePlanFeature(id);
            return res.status(200).json(ResponseUtil.success("Plan feature deactivated successfully", feature));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message || "Plan feature not found"));
        }
    };

    // Activate
    activatePlanFeature = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Plan feature ID is required"));

            const feature = await this.planFeatureService.activatePlanFeature(id);
            return res.status(200).json(ResponseUtil.success("Plan feature activated successfully", feature));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message || "Plan feature not found"));
        }
    };
}