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
            // console.log("Received login request with identifier:", identifier);
            // console.log(identifier, pin)

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

    sendOtp = async (req: Request, res: Response) => {
        try {
            const { mobile } = req.body;

            if (!mobile) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Mobile number is required")
                );
            }

            const result = await this.userService.sendOtp(mobile);

            return res.status(200).json(
                ResponseUtil.success("OTP sent successfully", result)
            );

        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(error.message)
            );
        }
    };

    verifyOtp = async (req: Request, res: Response) => {
        try {
            const { mobile, otp } = req.body;

            if (!mobile || !otp) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Mobile and OTP are required")
                );
            }

            const result = await this.userService.verifyOtp(mobile, otp);

            return res.status(200).json(
                ResponseUtil.success("Login successful", result)
            );

        } catch (error: any) {
            return res.status(401).json(
                ResponseUtil.unauthorized(error.message)
            );
        }
    };

    updatePin = async (req: Request, res: Response) => {
        try {
            const { mobile, pin } = req.body;

            if (!mobile || !pin) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Mobile and PIN are required")
                );
            }

            const result = await this.userService.updatePin(mobile, pin);

            return res.status(200).json(
                ResponseUtil.success("PIN updated successfully", result)
            );

        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(error.message)
            );
        }
    };
}