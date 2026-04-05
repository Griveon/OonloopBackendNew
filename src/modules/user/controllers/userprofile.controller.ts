import type { Request, Response } from "express";
import { UserService } from "../../user/services/user.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    updateProfile = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id; 
            if (!userId) {
                return res.status(401).json(ResponseUtil.unauthorized("Unauthorized"));
            }

            const updatedUser = await this.userService.updateProfile(userId, req.body);

            return res
                .status(200)
                .json(ResponseUtil.success("Profile updated successfully", updatedUser));

        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };
}