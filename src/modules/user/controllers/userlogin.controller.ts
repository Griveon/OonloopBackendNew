import type { Request, Response } from "express";
import { UserService } from "../../user/services/user.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class UserLoginController {

    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    login = async (req: Request, res: Response) => {
        try {
            const { identifier, pin } = req.body;
            console.log(identifier, pin)

            const data = await this.userService.login(identifier, pin);

            return res
                .status(200)
                .json(ResponseUtil.success("Login successful", data));

        } catch (error: any) {
            return res
                .status(401)
                .json(ResponseUtil.unauthorized(error.message));
        }
    };
}