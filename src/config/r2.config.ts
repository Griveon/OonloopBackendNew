import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

/**
 * Validate required env variables
 */
const requiredEnv = [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_ACCESS_KEY",
    "CLOUDFLARE_SECRET_KEY",
];

requiredEnv.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`Missing required env variable: ${key}`);
    }
});

/**
 * Cloudflare R2 Client
 */
export const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY as string,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_KEY as string,
    },
});