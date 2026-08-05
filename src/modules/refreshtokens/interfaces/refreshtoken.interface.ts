import type {
    HydratedDocument,
    Types,
} from "mongoose";

export interface IRefreshToken {
    user: Types.ObjectId;
    tokenHash: string;
    deviceId?: string;

    expiresAt: Date;

    isRevoked: boolean;
    revokedAt: Date | null;
    lastUsedAt: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

export type IRefreshTokenDocument =
    HydratedDocument<IRefreshToken>;