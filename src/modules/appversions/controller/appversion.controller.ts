import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { AppVersionService } from "../services/appversion.service.js";

export class AppVersionController {
    private service = new AppVersionService();

    createOrUpdate = async (
        req: Request,
        res: Response
    ) => {
        try {
            const data =
                await this.service.createOrUpdate(
                    req.body
                );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "App version saved successfully",
                        data
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(
                    ResponseUtil.badRequest(
                        error.message
                    )
                );
        }
    };

    checkVersion = async (
        req: Request,
        res: Response
    ) => {
        try {
            const data =
                await this.service.checkVersion({
                    platform: String(req.query.platform || ""),
                    versionCode: String(req.query.versionCode || ""),
                });

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "App version checked successfully",
                        data
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(
                    ResponseUtil.badRequest(
                        error.message
                    )
                );
        }
    };

    getAll = async (
        req: Request,
        res: Response
    ) => {
        try {
            const data =
                await this.service.getAll();

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "App versions fetched successfully",
                        data
                    )
                );
        } catch (error: any) {
            return res
                .status(500)
                .json(
                    ResponseUtil.serverError(
                        error.message
                    )
                );
        }
    };

    getById = async (
        req: Request,
        res: Response
    ) => {
        try {
            const data =
                await this.service.getById(
                    req.params.id
                );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "App version fetched successfully",
                        data
                    )
                );
        } catch (error: any) {
            return res
                .status(404)
                .json(
                    ResponseUtil.notFound(
                        error.message
                    )
                );
        }
    };

    updateById = async (
        req: Request,
        res: Response
    ) => {
        try {
            const data =
                await this.service.updateById(
                    req.params.id,
                    req.body
                );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "App version updated successfully",
                        data
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(
                    ResponseUtil.badRequest(
                        error.message
                    )
                );
        }
    };

    deleteById = async (
        req: Request,
        res: Response
    ) => {
        try {
            await this.service.deleteById(
                req.params.id
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "App version deleted successfully",
                        {}
                    )
                );
        } catch (error: any) {
            return res
                .status(404)
                .json(
                    ResponseUtil.notFound(
                        error.message
                    )
                );
        }
    };
}