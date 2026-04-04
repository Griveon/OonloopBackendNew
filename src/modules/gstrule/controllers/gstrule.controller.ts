import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { GSTRuleService } from "../services/gstrule.services.js";

export class GSTRuleController {
    private service: GSTRuleService;

    constructor() {
        this.service = new GSTRuleService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    create = async (req: Request, res: Response) => {
        try {
            const result = await this.service.create(req.body);
            return res
                .status(201)
                .json(ResponseUtil.created("GST Rule created", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    getAll = async (req: Request, res: Response) => {
        try {
            const result = await this.service.getAll();
            return res
                .status(200)
                .json(ResponseUtil.success("Fetched successfully", result));
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    getById = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id)
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("ID is required"));

            const result = await this.service.getById(id);
            return res
                .status(200)
                .json(ResponseUtil.success("Fetched successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id)
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("ID is required"));

            const result = await this.service.update(id, req.body);
            return res
                .status(200)
                .json(ResponseUtil.success("Updated successfully", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    deactivate = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            const result = await this.service.deactivate(id!);
            return res
                .status(200)
                .json(ResponseUtil.success("Deactivated successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    activate = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            const result = await this.service.activate(id!);
            return res
                .status(200)
                .json(ResponseUtil.success("Activated successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };
}