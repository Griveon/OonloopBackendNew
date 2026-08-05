import mongoose, {
    Schema,
    type Model,
} from "mongoose";

import type {
    IRefreshToken,
} from "../interfaces/refreshtoken.interface.js";

const RefreshTokenSchema =
    new Schema<IRefreshToken>(
        {
            user: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true,
            },

            tokenHash: {
                type: String,
                required: true,
                unique: true,
                index: true,
                trim: true,
            },

            deviceId: {
                type: String,
                trim: true,
                index: true,
                default: undefined,
            },

            expiresAt: {
                type: Date,
                required: true,
                index: true,
            },

            isRevoked: {
                type: Boolean,
                default: false,
                index: true,
            },

            revokedAt: {
                type: Date,
                default: null,
            },

            lastUsedAt: {
                type: Date,
                default: null,
            },
        },
        {
            timestamps: true,
            versionKey: false,
        }
    );

/**
 * Automatically removes refresh-token documents after expiresAt.
 */
RefreshTokenSchema.index(
    {
        expiresAt: 1,
    },
    {
        expireAfterSeconds: 0,
    }
);

/**
 * Useful for finding a user's token for a particular device.
 */
RefreshTokenSchema.index({
    user: 1,
    deviceId: 1,
});

/**
 * Useful for finding active or revoked user tokens.
 */
RefreshTokenSchema.index({
    user: 1,
    isRevoked: 1,
});

export const RefreshTokenModel:
    Model<IRefreshToken> =
    (mongoose.models.RefreshToken as
        Model<IRefreshToken>) ||
    mongoose.model<IRefreshToken>(
        "RefreshToken",
        RefreshTokenSchema
    );

export default RefreshTokenModel;