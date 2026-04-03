import mongoose, { Schema, Model } from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";
import type { IProviderConnectionDocument } from "../interfaces/providerconnection.interface.js";

dotenv.config();

const encryptedSchema = new Schema(
    {
        value: { type: String, required: true },
        iv: { type: String, required: true },
    },
    { _id: false }
);

const ProviderConnectionSchema: Schema<IProviderConnectionDocument> =
    new Schema(
        {

            provider: {
                type: String,
                required: true,
                enum: [
                    "razorpay",
                    "stripe",
                    "paypal",
                    "cashfree",
                    "payu",
                    "twilio",
                    "smtp",
                    "shiprocket",
                    "delhivery",
                ],
                index: true,
            },

            category: {
                type: String,
                enum: ["payment", "shipping", "sms", "email"],
                required: true,
            },

            name: {
                type: String,
                required: true,
                trim: true,
            },

            isActive: {
                type: Boolean,
                default: false,
            },

            environment: {
                type: String,
                enum: ["test", "live"],
                default: "test",
            },

            priority: {
                type: Number,
                default: 1,
            },

            credentials: {
                type: Map,
                of: encryptedSchema,
            },

            webhook: {
                url: String,
                secret: encryptedSchema,
            },

            lastUsedAt: Date,

            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },

            updatedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },

            isDeleted: {
                type: Boolean,
                default: false,
            },

        },
        { timestamps: true }
    );

const rawKey = process.env.INTEGRATION_SECRET_KEY!;

const ENCRYPTION_KEY: any = crypto
    .createHash("sha256")
    .update(rawKey)
    .digest();

ProviderConnectionSchema.methods.encryptValue = function (plainText: string) {
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        Buffer.from(ENCRYPTION_KEY, "hex"),
        iv
    );

    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    return {
        value: `${encrypted}:${tag.toString("hex")}`,
        iv: iv.toString("hex"),
    };
};

ProviderConnectionSchema.methods.decryptValue = function (data: any) {
    const [encrypted, tag] = data.value.split(":");

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        Buffer.from(ENCRYPTION_KEY, "hex"),
        Buffer.from(data.iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
};

ProviderConnectionSchema.index(
    { storeId: 1, provider: 1, environment: 1 },
    { unique: true }
);


export const ProviderConnectionModel: Model<IProviderConnectionDocument> =
    mongoose.model<IProviderConnectionDocument>(
        "ProviderConnection",
        ProviderConnectionSchema
    );