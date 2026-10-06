import type { Request, Response } from "express";
import { AppVersionService } from "../services/appversion.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";
import { AppError } from "../../../utils/appError.js";
import {
    checkVersionQuerySchema,
    platformParamSchema,
} from "../validations/appversion.validation.js";
import type { AppPlatform } from "../constants/appversion.constant.js";

export class AppVersionController {
    private service: AppVersionService;

    constructor() {
        this.service = new AppVersionService();
    }

    /**
     * Public API: Check app version compatibility and required updates.
     * GET /app-version/check?platform=android&version=1.5.0&buildNumber=15
     */
    checkVersion = async (req: Request, res: Response) => {
        try {
            const validation = checkVersionQuerySchema.safeParse(req.query);

            if (!validation.success) {
                const friendlyErrors = validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                }));

                return res
                    .status(400)
                    .json(
                        ResponseUtil.validationError(
                            "Validation error",
                            friendlyErrors
                        )
                    );
            }

            const result = await this.service.checkVersion({
                platform: validation.data.platform as AppPlatform,
                version: validation.data.version,
                buildNumber: validation.data.buildNumber,
            });

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "App version checked successfully",
                        result
                    )
                );
        } catch (error: any) {
            return this.handleError(res, error);
        }
    };

    /**
     * Admin API: Upsert platform version configuration.
     * PUT /app-version/:platform
     */
    upsertPlatformConfig = async (req: Request, res: Response) => {
        try {
            const paramValidation = platformParamSchema.safeParse(req.params);

            if (!paramValidation.success) {
                const friendlyErrors = paramValidation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                }));

                return res
                    .status(400)
                    .json(
                        ResponseUtil.validationError(
                            "Validation error",
                            friendlyErrors
                        )
                    );
            }

            const platform = paramValidation.data.platform as AppPlatform;
            const result = await this.service.upsertPlatformConfig(
                platform,
                req.body
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        `App version configuration for ${platform} saved successfully`,
                        result
                    )
                );
        } catch (error: any) {
            return this.handleError(res, error);
        }
    };

    /**
     * Admin API: Get version configuration for a platform.
     * GET /app-version/:platform
     */
    getConfigByPlatform = async (req: Request, res: Response) => {
        try {
            const paramValidation = platformParamSchema.safeParse(req.params);

            if (!paramValidation.success) {
                return res
                    .status(400)
                    .json(
                        ResponseUtil.badRequest(
                            "Invalid platform. Supported platforms are: android, ios"
                        )
                    );
            }

            const platform = paramValidation.data.platform as AppPlatform;
            const result = await this.service.getConfigByPlatform(platform);

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        `App version configuration for ${platform} fetched successfully`,
                        result
                    )
                );
        } catch (error: any) {
            return this.handleError(res, error);
        }
    };

    /**
     * Admin API: Get all platform configurations.
     * GET /app-version
     */
    getAllConfigs = async (_req: Request, res: Response) => {
        try {
            const result = await this.service.getAllConfigs();

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "App version configurations fetched successfully",
                        result
                    )
                );
        } catch (error: any) {
            return this.handleError(res, error);
        }
    };

    /**
     * Admin API: Delete platform version configuration.
     * DELETE /app-version/:platform
     */
    deleteConfigByPlatform = async (req: Request, res: Response) => {
        try {
            const paramValidation = platformParamSchema.safeParse(req.params);

            if (!paramValidation.success) {
                return res
                    .status(400)
                    .json(
                        ResponseUtil.badRequest(
                            "Invalid platform. Supported platforms are: android, ios"
                        )
                    );
            }

            const platform = paramValidation.data.platform as AppPlatform;
            const result = await this.service.deleteConfigByPlatform(platform);

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        `App version configuration for ${platform} deleted successfully`,
                        result
                    )
                );
        } catch (error: any) {
            return this.handleError(res, error);
        }
    };

    /**
     * Unified error response handler
     */
    private handleError(res: Response, error: any) {
        if (error instanceof AppError) {
            if (error.statusCode === 404) {
                return res
                    .status(404)
                    .json(ResponseUtil.notFound(error.message));
            }
            return res
                .status(error.statusCode)
                .json(ResponseUtil.badRequest(error.message));
        }

        return res
            .status(500)
            .json(
                ResponseUtil.serverError(
                    error.message || "Internal server error",
                    error
                )
            );
    }
}