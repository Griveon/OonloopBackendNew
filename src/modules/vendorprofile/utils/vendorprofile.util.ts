import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";

import { r2Client } from "../../../config/r2.config.js";

dotenv.config();

export const uploadToR2 = async (
    file: Express.Multer.File,
    folder = "uploads"
): Promise<string> => {
    try {
        if (!file || !file.buffer) {
            throw new Error("Invalid file");
        }

        const fileExt = file.originalname.split(".").pop() || "bin";
        const fileName = `${folder}/${crypto.randomUUID()}.${fileExt}`;

        const params = {
            Bucket: process.env.CLOUDFLARE_VENDOR_DOCS_BUCKET as string,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        await r2Client.send(new PutObjectCommand(params));

        return `https://media.${process.env.BASE_URL_DOMAIN}/${process.env.CLOUDFLARE_VENDOR_DOCS_BUCKET}/${fileName}`;
    } catch (error: any) {
        console.error("R2 upload error:", error.message);
        throw new Error(error.message || "File upload failed");
    }
};