import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserService } from "../../modules/user/services/user.service.js";
import { ResponseUtil } from "../../utils/response.util.js";

dotenv.config();

const userService = new UserService();

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
            };
        }
    }
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json(
                ResponseUtil.unauthorized("Unauthorized: No token provided")
            );
        }

        const token: any = authHeader.split(" ")[1];


        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not configured");
        }

        let decoded: any;

        try {
            decoded = jwt.verify(token, secret);
        } catch (err) {
            return res.status(401).json(
                ResponseUtil.unauthorized("Unauthorized: Invalid token")
            );
        }


        if (!decoded || !decoded.id) {
            return res.status(401).json(
                ResponseUtil.unauthorized("Unauthorized: Invalid token payload")
            );
        }


        const user = await userService.getUserById(decoded.id);

        if (!user) {
            return res.status(404).json(
                ResponseUtil.notFound("User not found")
            );
        }


        req.user = {
            id: user._id.toString(),
        };

        next();
    } catch (err: any) {
        console.error("AuthMiddleware Error:", err);

        return res.status(500).json(
            ResponseUtil.serverError(
                err.message || "Internal server error",
                err
            )
        );
    }
};