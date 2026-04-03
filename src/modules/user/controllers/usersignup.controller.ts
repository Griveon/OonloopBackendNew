import type { Request, Response } from "express";
import { UserService } from "../../user/services/user.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class UserSingupController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    signup = async (req: Request, res: Response) => {
        try {
            const user = await this.userService.createUser(req.body);

            return res
                .status(201)
                .json(ResponseUtil.created("User registered successfully", user));
        } catch (error: any) {
            console.log(error);
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };
}