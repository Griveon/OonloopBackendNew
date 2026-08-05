import crypto from "crypto";

import { UserModel } from
    "../../user/models/user.model.js";

import { RefreshTokenRepository } from
    "../repositories/refreshtoken.repository.js";

import {
    type UserRole,
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    verifyRefreshToken,
} from "../utils/authtoken.util.js";

const ONE_YEAR_IN_MILLISECONDS =
    365 * 24 * 60 * 60 * 1000;

export class AuthSessionService {
    private refreshTokenRepository:
        RefreshTokenRepository;

    constructor() {
        this.refreshTokenRepository =
            new RefreshTokenRepository();
    }

    async createSession(
        userId: string,
        deviceId?: string,
        requestedRole?: UserRole
    ) {
        const user = await UserModel.findById(userId)
            .select(
                "_id firstName lastName email mobileNumber role roles status"
            );

        if (!user) {
            throw new Error("User not found");
        }

        if (user.status !== "active") {
            throw new Error(
                "Your account is not active"
            );
        }

        const primaryRole = user.role as UserRole;

        const roles: UserRole[] =
            Array.isArray(user.roles) &&
                user.roles.length > 0
                ? (user.roles as UserRole[])
                : [primaryRole];

        const activeRole =
            requestedRole ?? primaryRole;

        if (!roles.includes(activeRole)) {
            throw new Error(
                `You are not registered as ${activeRole}`
            );
        }

        const accessToken = generateAccessToken({
            userId: user._id.toString(),
            role: activeRole,
            roles,
        });

        const tokenId = crypto.randomUUID();

        const refreshToken = generateRefreshToken({
            userId: user._id.toString(),
            tokenId,
            role: activeRole,
        });

        const tokenHash =
            hashRefreshToken(refreshToken);

        await this.refreshTokenRepository.create({
            user: user._id,
            tokenHash,
            ...(deviceId ? { deviceId } : {}),
            expiresAt: new Date(
                Date.now() + ONE_YEAR_IN_MILLISECONDS
            ),
        });

        return {
            user,
            accessToken,
            refreshToken,
            expiresIn: 24 * 60 * 60,
        };
    }

    async refreshSession(
        refreshToken: string,
        deviceId?: string
    ) {
        let decoded;

        try {
            decoded =
                verifyRefreshToken(refreshToken);
        } catch {
            throw new Error(
                "Refresh token is invalid or expired"
            );
        }

        const oldTokenHash =
            hashRefreshToken(refreshToken);

        const storedToken =
            await this.refreshTokenRepository
                .findActiveByHash(oldTokenHash);

        if (!storedToken) {
            throw new Error(
                "Refresh session is no longer valid"
            );
        }

        if (
            storedToken.user.toString() !==
            decoded.userId
        ) {
            await this.refreshTokenRepository
                .revokeById(
                    storedToken._id.toString()
                );

            throw new Error(
                "Refresh token user mismatch"
            );
        }

        if (
            storedToken.deviceId &&
            deviceId &&
            storedToken.deviceId !== deviceId
        ) {
            throw new Error(
                "Refresh token belongs to another device"
            );
        }

        const user = await UserModel.findById(
            decoded.userId
        ).select(
            "_id firstName lastName email mobileNumber role roles status"
        );

        if (!user) {
            throw new Error("User not found");
        }

        if (user.status !== "active") {
            await this.refreshTokenRepository
                .revokeAllUserTokens(
                    user._id.toString()
                );

            throw new Error(
                "Your account is not active"
            );
        }

        await this.refreshTokenRepository
            .revokeById(
                storedToken._id.toString()
            );

        return this.createSession(
            user._id.toString(),
            deviceId ?? storedToken.deviceId,
            decoded.role
        );
    }

    async logout(refreshToken: string) {
        const tokenHash =
            hashRefreshToken(refreshToken);

        await this.refreshTokenRepository
            .revokeByHash(tokenHash);

        return {
            loggedOut: true,
        };
    }

    async logoutAll(userId: string) {
        await this.refreshTokenRepository
            .revokeAllUserTokens(userId);

        return {
            loggedOutFromAllDevices: true,
        };
    }
}