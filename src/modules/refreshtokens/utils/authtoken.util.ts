import crypto from "crypto";
import jwt, {
    type Secret,
    type SignOptions,
} from "jsonwebtoken";

export type UserRole =
    | "admin"
    | "user"
    | "vendor"
    | "driver";

export interface AccessTokenPayload {
    userId: string;
    role: UserRole;
    roles: UserRole[];
    tokenType: "access";
}

export interface RefreshTokenPayload {
    userId: string;
    tokenId: string;
    role: UserRole;
    tokenType: "refresh";
}

type JwtExpiresIn = NonNullable<
    SignOptions["expiresIn"]
>;

const getAccessSecret = (): Secret => {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
        throw new Error(
            "JWT_ACCESS_SECRET is not configured"
        );
    }

    return secret;
};

const getRefreshSecret = (): Secret => {
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
        throw new Error(
            "JWT_REFRESH_SECRET is not configured"
        );
    }

    return secret;
};

const getAccessTokenOptions = (): SignOptions => {
    const expiresIn = (
        process.env.JWT_ACCESS_EXPIRES_IN ?? "1d"
    ) as JwtExpiresIn;

    return {
        expiresIn,
    };
};

const getRefreshTokenOptions = (): SignOptions => {
    const expiresIn = (
        process.env.JWT_REFRESH_EXPIRES_IN ?? "365d"
    ) as JwtExpiresIn;

    return {
        expiresIn,
    };
};

export const generateAccessToken = (
    payload: Omit<AccessTokenPayload, "tokenType">
): string => {
    const tokenPayload: AccessTokenPayload = {
        ...payload,
        tokenType: "access",
    };

    return jwt.sign(
        tokenPayload,
        getAccessSecret(),
        getAccessTokenOptions()
    );
};

export const generateRefreshToken = (
    payload: Omit<RefreshTokenPayload, "tokenType">
): string => {
    const tokenPayload: RefreshTokenPayload = {
        ...payload,
        tokenType: "refresh",
    };

    return jwt.sign(
        tokenPayload,
        getRefreshSecret(),
        getRefreshTokenOptions()
    );
};

export const verifyRefreshToken = (
    token: string
): RefreshTokenPayload => {
    const payload = jwt.verify(
        token,
        getRefreshSecret()
    ) as RefreshTokenPayload;

    if (
        !payload.userId ||
        !payload.tokenId ||
        !payload.role ||
        payload.tokenType !== "refresh"
    ) {
        throw new Error("Invalid refresh token");
    }

    return payload;
};

export const verifyAccessToken = (
    token: string
): AccessTokenPayload => {
    const payload = jwt.verify(
        token,
        getAccessSecret()
    ) as AccessTokenPayload;

    if (
        !payload.userId ||
        !payload.role ||
        !Array.isArray(payload.roles) ||
        payload.tokenType !== "access"
    ) {
        throw new Error("Invalid access token");
    }

    return payload;
};

export const hashRefreshToken = (
    token: string
): string => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};