import type {
    Request,
    Response,
    NextFunction,
} from "express";

import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import { UserService } from "../../modules/user/services/user.service.js";

dotenv.config();

const userService = new UserService();

/**
 * Optional authentication middleware.
 *
 * Behavior:
 *
 * No token:
 *      req.user remains unset
 *      request continues
 *
 * Valid token:
 *      req.user is populated
 *      request continues
 *
 * Invalid / expired token:
 *      req.user remains unset
 *      request continues as guest
 *
 * IMPORTANT:
 * Do NOT use this middleware on routes that REQUIRE authentication.
 * Protected routes must continue using authMiddleware.
 */
export const optionalAuthMiddleware = async (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        // No Authorization header = guest request
        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return next();
        }

        const token = authHeader.split(" ")[1];

        // Invalid empty bearer token = continue as guest
        if (!token) {
            return next();
        }

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error(
                "OptionalAuthMiddleware: JWT_SECRET is not configured"
            );

            return next();
        }

        let decoded: any;

        try {
            decoded = jwt.verify(token, secret);
        } catch {
            /**
             * Optional auth intentionally does NOT return 401.
             *
             * Invalid/expired token on an optional-auth route
             * simply means this request behaves as a guest request.
             */
            return next();
        }

        if (!decoded?.id) {
            return next();
        }

        try {
            const user = await userService.getUserById(
                decoded.id
            );

            if (!user) {
                return next();
            }

            req.user = {
                id: user._id.toString(),
            };
        } catch (error) {
            console.error(
                "OptionalAuthMiddleware user lookup error:",
                error
            );

            /**
             * Do not fail the public request just because optional
             * user resolution failed.
             */
            return next();
        }

        return next();
    } catch (error) {
        console.error(
            "OptionalAuthMiddleware Error:",
            error
        );

        /**
         * Optional authentication must never block
         * a public/guest-capable route.
         */
        return next();
    }
};