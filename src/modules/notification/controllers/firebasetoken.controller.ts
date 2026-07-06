import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { FirebaseTokenService } from "../services/firebasetoken.service.js";

export class FirebaseTokenController {
    private firebaseTokenService: FirebaseTokenService;

    constructor() {
        this.firebaseTokenService = new FirebaseTokenService();
    }

    private getLoggedInUserId(req: Request): string | null {
        const authReq = req as any;

        return (
            authReq.user?._id?.toString?.() ||
            authReq.user?.id?.toString?.() ||
            authReq.user?.userId?.toString?.() ||
            authReq.userId?.toString?.() ||
            null
        );
    }

    saveToken = async (req: Request, res: Response) => {
        try {
            const userId = this.getLoggedInUserId(req);

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.unauthorized("Unauthorized user"));
            }

            const tokenDoc = await this.firebaseTokenService.saveToken(
                userId,
                req.body
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Firebase token saved successfully",
                        tokenDoc
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    getMyTokens = async (req: Request, res: Response) => {
        try {
            const userId = this.getLoggedInUserId(req);

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.unauthorized("Unauthorized user"));
            }

            const result = await this.firebaseTokenService.getMyTokens(userId);

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Firebase tokens fetched successfully",
                        result
                    )
                );
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    removeToken = async (req: Request, res: Response) => {
        try {
            const userId = this.getLoggedInUserId(req);

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.unauthorized("Unauthorized user"));
            }

            const { token } = req.body;

            const result = await this.firebaseTokenService.removeToken(
                userId,
                token
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Firebase token removed successfully",
                        result
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    deactivateToken = async (req: Request, res: Response) => {
        try {
            const userId = this.getLoggedInUserId(req);

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.unauthorized("Unauthorized user"));
            }

            const { token } = req.body;

            const result = await this.firebaseTokenService.deactivateToken(
                userId,
                token
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Firebase token deactivated successfully",
                        result
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    logoutFromAllDevices = async (req: Request, res: Response) => {
        try {
            const userId = this.getLoggedInUserId(req);

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.unauthorized("Unauthorized user"));
            }

            const result =
                await this.firebaseTokenService.deactivateAllUserTokens(userId);

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "All Firebase tokens deactivated successfully",
                        result
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    sendTestNotification = async (req: Request, res: Response) => {
        try {
            const userId = this.getLoggedInUserId(req);

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.unauthorized("Unauthorized user"));
            }

            const result =
                await this.firebaseTokenService.sendNotificationToUser({
                    userId,
                    title: req.body.title || "Test Notification",
                    body:
                        req.body.body ||
                        "Firebase push notification is working.",
                    data: req.body.data || {
                        type: "TEST_NOTIFICATION",
                    },
                });

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Test notification processed successfully",
                        result
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    sendNotificationToUser = async (req: Request, res: Response) => {
        try {
            const { userId, title, body, data } = req.body;

            const result =
                await this.firebaseTokenService.sendNotificationToUser({
                    userId,
                    title,
                    body,
                    data,
                });

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Notification sent successfully",
                        result
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };
}