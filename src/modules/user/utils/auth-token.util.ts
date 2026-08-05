import crypto from "node:crypto";

import jwt, {
    type JwtPayload,
    type Secret,
} from "jsonwebtoken";
import type { UserRole } from "../interfaces/user.interface.js";


export type AuthRole = UserRole;

interface TokenUser {
    _id: unknown;
    email: string;
    role?: AuthRole;
    roles?: AuthRole[];
}

export interface AccessTokenPayload extends JwtPayload {
    id: string;
    email: string;
    role: AuthRole;
    roles: AuthRole[];
    tokenType: "access";
    sessionId: string;
}

export interface RefreshTokenPayload extends JwtPayload {
    id: string;
    email: string;
    role: AuthRole;
    roles: AuthRole[];
    tokenType: "refresh";
    jti: string;
}

const VALID_ROLES: readonly AuthRole[] = [
    "admin",
    "user",
    "vendor",
    "driver",
];

export const isAuthRole = (value: unknown): value is AuthRole => {
    return (
        typeof value === "string" &&
        VALID_ROLES.includes(value as AuthRole)
    );
};

const getRequiredSecret = (key: string): Secret => {
    const value = process.env[key];

    if (!value || value.trim().length < 16) {
        throw new Error(
            `${key} is not configured or is too short`
        );
    }

    return value;
};

const getAccessSecret = (): Secret => {
    return getRequiredSecret("JWT_ACCESS_SECRET");
};

const getRefreshSecret = (): Secret => {
    return getRequiredSecret("JWT_REFRESH_SECRET");
};

const readPositiveInteger = (
    value: string | undefined,
    fallback: number
): number => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.floor(parsed);
};

const getAccessLifetimeSeconds = (): number => {
    const days = readPositiveInteger(
        process.env.JWT_ACCESS_DAYS,
        1
    );

    return days * 24 * 60 * 60;
};

const getRefreshLifetimeSeconds = (): number => {
    const days = readPositiveInteger(
        process.env.JWT_REFRESH_DAYS,
        30
    );

    return days * 24 * 60 * 60;
};

const normalizeRoles = (
    user: TokenUser,
    selectedRole: AuthRole
): AuthRole[] => {
    const availableRoles = Array.isArray(user.roles)
        ? user.roles.filter(isAuthRole)
        : [];

    if (isAuthRole(user.role)) {
        availableRoles.push(user.role);
    }

    availableRoles.push(selectedRole);

    return [...new Set(availableRoles)];
};

export const hashToken = (token: string): string => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

export const createTokenPair = (
    user: TokenUser,
    selectedRole: AuthRole,
    sessionId: string = crypto.randomUUID()
) => {
    const accessLifetimeSeconds =
        getAccessLifetimeSeconds();

    const refreshLifetimeSeconds =
        getRefreshLifetimeSeconds();

    const commonPayload = {
        id: String(user._id),
        email: user.email,
        role: selectedRole,
        roles: normalizeRoles(user, selectedRole),
    };

    /**
     * Numeric expiresIn values are seconds.
     *
     * Using a number avoids the SignOptions["expiresIn"] +
     * exactOptionalPropertyTypes overload error.
     */
    const accessToken = jwt.sign(
        {
            ...commonPayload,
            tokenType: "access",
            sessionId,
        },
        getAccessSecret(),
        {
            algorithm: "HS256",
            expiresIn: accessLifetimeSeconds,
        }
    );

    const refreshToken = jwt.sign(
        {
            ...commonPayload,
            tokenType: "refresh",
        },
        getRefreshSecret(),
        {
            algorithm: "HS256",
            expiresIn: refreshLifetimeSeconds,
            jwtid: sessionId,
        }
    );

    return {
        sessionId,

        accessToken,
        refreshToken,

        refreshTokenHash: hashToken(refreshToken),

        accessTokenExpiresInSeconds:
            accessLifetimeSeconds,

        refreshTokenExpiresInSeconds:
            refreshLifetimeSeconds,

        refreshTokenExpiresAt: new Date(
            Date.now() +
            refreshLifetimeSeconds * 1000
        ),
    };
};

export const verifyAccessToken = (
    accessToken: string
): AccessTokenPayload => {
    const decoded = jwt.verify(
        accessToken,
        getAccessSecret(),
        {
            algorithms: ["HS256"],
        }
    );

    if (
        typeof decoded !== "object" ||
        decoded === null
    ) {
        throw new Error("Invalid access token");
    }

    const payload = decoded as AccessTokenPayload;

    if (
        payload.tokenType !== "access" ||
        typeof payload.id !== "string" ||
        typeof payload.email !== "string" ||
        !isAuthRole(payload.role) ||
        typeof payload.sessionId !== "string"
    ) {
        throw new Error("Invalid access token");
    }

    return payload;
};

export const verifyRefreshToken = (
    refreshToken: string
): RefreshTokenPayload => {
    const decoded = jwt.verify(
        refreshToken,
        getRefreshSecret(),
        {
            algorithms: ["HS256"],
        }
    );

    if (
        typeof decoded !== "object" ||
        decoded === null
    ) {
        throw new Error("Invalid refresh token");
    }

    const payload = decoded as RefreshTokenPayload;

    if (
        payload.tokenType !== "refresh" ||
        typeof payload.id !== "string" ||
        typeof payload.email !== "string" ||
        !isAuthRole(payload.role) ||
        typeof payload.jti !== "string"
    ) {
        throw new Error("Invalid refresh token");
    }

    return payload;
};
