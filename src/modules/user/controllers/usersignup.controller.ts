import type { Request, Response } from "express";
import { UserService } from "../../user/services/user.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

type UserRole = "user" | "vendor" | "driver";

const ALLOWED_ROLES: UserRole[] = ["user", "vendor", "driver"];

export class UserSingupController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    signup = async (req: Request, res: Response) => {
        try {
            const {
                firstName,
                lastName,
                email,
                mobileNumber,
                dateOfBirth,
                gender,
                password,
                pin,
                role,
            } = req.body;

            const normalizedFirstName = firstName?.toString().trim();
            const normalizedLastName = lastName?.toString().trim() || "";
            const normalizedEmail = email?.toString().toLowerCase().trim();
            const normalizedMobileNumber = mobileNumber?.toString().trim();
            const normalizedGender = gender?.toString().toLowerCase();
            const normalizedRole =
                role?.toString().trim().toLowerCase() || "user";

            if (!normalizedFirstName || normalizedFirstName.length < 2) {
                return res
                    .status(400)
                    .json(
                        ResponseUtil.badRequest(
                            "First name must be at least 2 characters"
                        )
                    );
            }

            if (!normalizedEmail) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Email is required"));
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(normalizedEmail)) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Invalid email format"));
            }

            if (!password || password.length < 6) {
                return res
                    .status(400)
                    .json(
                        ResponseUtil.badRequest(
                            "Password must be at least 6 characters"
                        )
                    );
            }

            if (
                normalizedMobileNumber &&
                !/^[6-9]\d{9}$/.test(normalizedMobileNumber)
            ) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Invalid mobile number"));
            }

            if (dateOfBirth && isNaN(new Date(dateOfBirth).getTime())) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Invalid date of birth"));
            }

            if (
                normalizedGender &&
                !["male", "female", "other"].includes(normalizedGender)
            ) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Invalid gender value"));
            }

            if (pin && !/^\d{6}$/.test(pin.toString())) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("PIN must be exactly 6 digits"));
            }

            if (!ALLOWED_ROLES.includes(normalizedRole as UserRole)) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Invalid role value"));
            }

            const payload = {
                firstName: normalizedFirstName,
                lastName: normalizedLastName,
                email: normalizedEmail,
                mobileNumber: normalizedMobileNumber,
                dateOfBirth,
                gender: normalizedGender,
                password,
                pin,
                role: normalizedRole as UserRole,
                roles: [normalizedRole as UserRole],
            };

            const result = await this.userService.createUser(payload);

            return res
                .status(201)
                .json(
                    ResponseUtil.created(
                        result?.message || "User registered successfully",
                        result
                    )
                );
        } catch (error: any) {
            console.log(error);

            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message || "Signup failed"));
        }
    };
}