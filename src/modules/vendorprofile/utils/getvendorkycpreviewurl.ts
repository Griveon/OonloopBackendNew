import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import { r2Client } from "../../../config/r2.config.js";

dotenv.config();

export const getVendorKycPreviewUrl = async (
    fileKey: string,
    expiresInSeconds: number = 60 * 10
): Promise<string> => {
    if (!fileKey) {
        throw new Error("File key is required");
    }

    console.log("keys", process.env.CLOUDFLARE_VENDOR_KYC_DOCS_BUCKET, fileKey);

    const command = new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_VENDOR_KYC_DOCS_BUCKET as string,
        Key: fileKey,
    });

    return await getSignedUrl(r2Client, command, {
        expiresIn: expiresInSeconds,
    });
};