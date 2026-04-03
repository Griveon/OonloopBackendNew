import type { Request, Response } from "express";
import { PlanService } from "../services/plan.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class PlanController {
    private planService: PlanService;

    constructor() {
        this.planService = new PlanService();
    }

    createPlan = async (req: Request, res: Response) => {
        try {
            const plan = await this.planService.createPlan(req.body);
            return res.status(201).json(ResponseUtil.created("Plan created successfully", plan));
        } catch (error: any) {
            console.error(error);
            return res.status(400).json(ResponseUtil.badRequest(error.message || "Bad request"));
        }
    };

    getAllPlans = async (_req: Request, res: Response) => {
        try {
            const plans = await this.planService.getAllPlans();
            return res.status(200).json(ResponseUtil.success("Plans fetched successfully", plans));
        } catch (error: any) {
            console.error(error);
            return res.status(500).json(ResponseUtil.serverError(error.message || "Internal server error", error));
        }
    };

    getAllPlansWithFeatures = async (_req: Request, res: Response) => {
        try {
            const plans = await this.planService.getAllPlansWithFeatures();
            return res.status(200).json(ResponseUtil.success("Plans with features fetched successfully", plans));
        } catch (error: any) {
            console.error(error);
            return res.status(500).json(ResponseUtil.serverError(error.message || "Internal server error", error));
        }
    };

    getAllPlansWithQuery = async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = (req.query.search as string) || "";

            const { plans, total } = await this.planService.getAllPlansWithQuery(page, limit, search);

            return res.status(200).json(
                ResponseUtil.paginated("Plans fetched successfully", plans, page, limit, total)
            );
        } catch (error: any) {
            console.error(error);
            return res.status(500).json(ResponseUtil.serverError(error.message || "Internal server error", error));
        }
    };

    getPlanById = async (req: Request, res: Response) => {
        try {
            const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!planId) return res.status(400).json(ResponseUtil.badRequest("Plan ID is required"));

            const plan = await this.planService.getPlanById(planId);
            return res.status(200).json(ResponseUtil.success("Plan fetched successfully", plan));
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(ResponseUtil.notFound(error.message || "Plan not found"));
        }
    };

    updatePlan = async (req: Request, res: Response) => {
        try {
            const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!planId) return res.status(400).json(ResponseUtil.badRequest("Plan ID is required"));

            const updatedPlan = await this.planService.updatePlan(planId, req.body);
            return res.status(200).json(ResponseUtil.success("Plan updated successfully", updatedPlan));
        } catch (error: any) {
            console.error(error);
            return res.status(400).json(ResponseUtil.badRequest(error.message || "Bad request"));
        }
    };

    deactivatePlan = async (req: Request, res: Response) => {
        try {
            const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!planId) return res.status(400).json(ResponseUtil.badRequest("Plan ID is required"));

            const plan = await this.planService.deactivatePlan(planId);
            return res.status(200).json(ResponseUtil.success("Plan deactivated successfully", plan));
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(ResponseUtil.notFound(error.message || "Plan not found"));
        }
    };

    activatePlan = async (req: Request, res: Response) => {
        try {
            const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!planId) return res.status(400).json(ResponseUtil.badRequest("Plan ID is required"));

            const plan = await this.planService.activatePlan(planId);
            return res.status(200).json(ResponseUtil.success("Plan activated successfully", plan));
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(ResponseUtil.notFound(error.message || "Plan not found"));
        }
    };
}