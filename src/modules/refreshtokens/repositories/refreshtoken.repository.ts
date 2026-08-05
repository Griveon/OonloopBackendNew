import { RefreshTokenModel } from "../models/refreshtoken.model.js";


export class RefreshTokenRepository {
    async create(data: any) {
        return RefreshTokenModel.create(data);
    }

    async findActiveByHash(tokenHash: string) {
        return RefreshTokenModel.findOne({
            tokenHash,
            isRevoked: false,
            expiresAt: {
                $gt: new Date(),
            },
        });
    }

    async revokeByHash(tokenHash: string) {
        return RefreshTokenModel.findOneAndUpdate(
            {
                tokenHash,
                isRevoked: false,
            },
            {
                $set: {
                    isRevoked: true,
                    revokedAt: new Date(),
                },
            },
            {
                new: true,
            }
        );
    }

    async revokeById(id: string) {
        return RefreshTokenModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    isRevoked: true,
                    revokedAt: new Date(),
                },
            },
            {
                new: true,
            }
        );
    }

    async revokeUserDeviceTokens(
        userId: string,
        deviceId: string
    ) {
        return RefreshTokenModel.updateMany(
            {
                user: userId,
                deviceId,
                isRevoked: false,
            },
            {
                $set: {
                    isRevoked: true,
                    revokedAt: new Date(),
                },
            }
        );
    }

    async revokeAllUserTokens(userId: string) {
        return RefreshTokenModel.updateMany(
            {
                user: userId,
                isRevoked: false,
            },
            {
                $set: {
                    isRevoked: true,
                    revokedAt: new Date(),
                },
            }
        );
    }

    async markUsed(id: string) {
        return RefreshTokenModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    lastUsedAt: new Date(),
                },
            },
            {
                new: true,
            }
        );
    }
}