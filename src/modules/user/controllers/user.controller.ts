import type { Request, Response } from "express";
import { UserService } from "../../user/services/user.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class UserMainController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    updateProfile = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res
                    .status(401)
                    .json(
                        ResponseUtil.unauthorized(
                            "Unauthorized"
                        )
                    );
            }

            const updatedUser =
                await this.userService.updateProfile(
                    userId,
                    req.body
                );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Profile updated successfully",
                        updatedUser
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

    getProfile = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res
                    .status(401)
                    .json(
                        ResponseUtil.unauthorized(
                            "Unauthorized"
                        )
                    );
            }

            const user =
                await this.userService.getUserProfile(
                    userId
                );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "User profile fetched successfully",
                        user
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

    /**
     * Permanently delete the currently authenticated user's account.
     *
     * Body:
     * {
     *   "confirmation": "DELETE",
     *   "pin": "123456"
     * }
     *
     * If the account does not have a PIN:
     * {
     *   "confirmation": "DELETE",
     *   "password": "current-password"
     * }
     */
    deleteAccount = async (
        req: Request,
        res: Response
    ) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res
                    .status(401)
                    .json(
                        ResponseUtil.unauthorized(
                            "Unauthorized"
                        )
                    );
            }

            const {
                confirmation,
                pin,
                password,
            } = req.body ?? {};

            const result =
                await this.userService.deleteAccount(
                    userId,
                    {
                        confirmation,
                        pin,
                        password,
                    }
                );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Account deleted permanently",
                        result
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
}
