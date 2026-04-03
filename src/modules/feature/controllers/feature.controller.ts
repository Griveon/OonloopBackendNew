import type { Request, Response } from "express";
import { FeatureService } from "../services/feature.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class FeatureController {
    private featureService: FeatureService;

    constructor() {
        this.featureService = new FeatureService();
    }

    // Create a new Feature
    createFeature = async (req: Request, res: Response) => {
        try {
            const feature = await this.featureService.createFeature(req.body);
            return res
                .status(201)
                .json(ResponseUtil.created("Feature created successfully", feature));
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

    // Get all Features
    getAllFeatures = async (_req: Request, res: Response) => {
        try {
            const features = await this.featureService.getAllFeatures();
            return res
                .status(200)
                .json(ResponseUtil.success("Features fetched successfully", features));
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

    // Get Feature by ID
    getFeatureById = async (req: Request, res: Response) => {
        try {
            const featureId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!featureId) {
                return res.status(400).json(ResponseUtil.badRequest("Feature ID is required"));
            }

            const feature = await this.featureService.getFeatureById(featureId);
            return res
                .status(200)
                .json(ResponseUtil.success("Feature fetched successfully", feature));
        } catch (error: any) {
            console.error(error);
            return res
                .status(404)
                .json(
                    ResponseUtil.notFound(
                        typeof error.message === "string" ? error.message : "Feature not found"
                    )
                );
        }
    };

    // Update Feature
    updateFeature = async (req: Request, res: Response) => {
        try {
            const featureId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!featureId) {
                return res.status(400).json(ResponseUtil.badRequest("Feature ID is required"));
            }

            const updatedFeature = await this.featureService.updateFeature(
                featureId, // Type assertion
                req.body
            );
            return res
                .status(200)
                .json(ResponseUtil.success("Feature updated successfully", updatedFeature));
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

    // Deactivate Feature
    deactivateFeature = async (req: Request, res: Response) => {
        try {
            const featureId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!featureId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Feature ID is required"));
            }

            const feature = await this.featureService.deactivateFeature(featureId); // Type assertion
            return res
                .status(200)
                .json(ResponseUtil.success("Feature deactivated successfully", feature));
        } catch (error: any) {
            console.error(error);
            return res
                .status(404)
                .json(
                    ResponseUtil.notFound(
                        typeof error.message === "string" ? error.message : "Feature not found"
                    )
                );
        }
    };

    // Activate Feature
    activateFeature = async (req: Request, res: Response) => {
        try {
            const featureId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!featureId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Feature ID is required"));
            }

            const feature = await this.featureService.activateFeature(featureId);
            return res
                .status(200)
                .json(ResponseUtil.success("Feature activated successfully", feature));
        } catch (error: any) {
            console.error(error);
            return res
                .status(404)
                .json(
                    ResponseUtil.notFound(
                        typeof error.message === "string"
                            ? error.message
                            : "Feature not found"
                    )
                );
        }
    };
}