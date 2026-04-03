import type { Request, Response } from "express";
import { ProviderConnectionService } from "../services/providerconnection.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class ProviderConnectionController {
    private service: ProviderConnectionService;

    constructor() {
        this.service = new ProviderConnectionService();
    }

    // ✅ SAME helper as VendorController
    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    // ✅ CREATE
    create = async (req: Request, res: Response) => {
        try {
            const data = req.body;

            const result = await this.service.createProviderConnection(data);

            return res
                .status(201)
                .json(ResponseUtil.created("Provider created", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    // ✅ GET ALL
    getAll = async (req: Request, res: Response) => {
        try {
            const storeId = this.getParam(req.query.storeId as string);

            if (!storeId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("storeId is required"));
            }

            const result = await this.service.getAll(storeId);

            return res
                .status(200)
                .json(ResponseUtil.success("Fetched successfully", result));
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    // ✅ GET BY ID
    getById = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Provider ID is required"));
            }

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

    // ✅ UPDATE
    update = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Provider ID is required"));
            }

            const data = req.body;

            const result = await this.service.update(id, data);

            return res
                .status(200)
                .json(ResponseUtil.success("Updated successfully", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    // ✅ DELETE (SOFT DELETE)
    delete = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Provider ID is required"));
            }

            const result = await this.service.delete(id);

            return res
                .status(200)
                .json(ResponseUtil.success("Deleted successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    // ✅ ACTIVATE
    activate = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Provider ID is required"));
            }

            const result = await this.service.activate(id);

            return res
                .status(200)
                .json(ResponseUtil.success("Activated successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    // ✅ DEACTIVATE
    deactivate = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Provider ID is required"));
            }

            const result = await this.service.deactivate(id);

            return res
                .status(200)
                .json(ResponseUtil.success("Deactivated successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };
}