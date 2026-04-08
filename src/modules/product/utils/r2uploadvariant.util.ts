import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";
import { r2Client } from "../../../config/r2.config.js";
import { compressImage } from "../../../utils/imageCompression.util.js";

dotenv.config();

export const uploadVariantImagesToR2 = async (
    files: Express.Multer.File[],
    vendorId: any = '',
): Promise<any[]> => {
    try {
        const uploaded: any[] = [];

        for (const file of files) {
            if (!file || !file.buffer) continue;

            const webpBuffer = await compressImage(file);

            const fileName = `vendor-${vendorId}/products/variants/${crypto.randomUUID()}.webp`;

            await r2Client.send(new PutObjectCommand({
                Bucket: process.env.CLOUDFLARE_PUBLIC_BUCKET as string,
                Key: fileName,
                Body: webpBuffer,
                ContentType: "image/webp",
            }));

            const url = `https://media.${process.env.BASE_URL_DOMAIN}/${fileName}`;

            uploaded.push({
                url,
                name: file.originalname || "",
                alt: file.originalname || "",
            });
        }

        return uploaded;
    } catch (error: any) {
        throw new Error(error.message || "File upload failed");
    }
};