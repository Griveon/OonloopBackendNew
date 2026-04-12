import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";
import { r2Client } from "../../../config/r2.config.js";

dotenv.config();

export const uploadVendorKycToR2 = async (
    files: Express.Multer.File[],
    vendorId: string = ""
): Promise<any[]> => {
    try {
        const uploaded: any[] = [];

        for (const file of files) {
            if (!file || !file.buffer) continue;

            const fileExt = file.originalname.split(".").pop();

            const fileName = `vendor-${vendorId}/kyc/${crypto.randomUUID()}.${fileExt}`;

            await r2Client.send(
                new PutObjectCommand({
                    Bucket: process.env.CLOUDFLARE_VENDOR_DOCS_BUCKET as string,
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );

            const url = `https://media.${process.env.BASE_URL_DOMAIN}/${process.env.CLOUDFLARE_VENDOR_DOCS_BUCKET}/${fileName}`;

            uploaded.push({
                url,
                name: file.originalname || "",
                type: file.mimetype || "",
            });
        }

        return uploaded;
    } catch (error: any) {
        console.error("Vendor KYC upload error:", error);
        throw new Error(error.message || "File upload failed");
    }
};