import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";
import { r2Client } from "../../../config/r2.config.js";
import { compressImage } from "../../../utils/imageCompression.util.js";

dotenv.config();

export const uploadVendorProfileImageToR2 = async (
    file: Express.Multer.File,
    vendorId: string
): Promise<string> => {
    try {
        if (!file?.buffer) {
            throw new Error("Profile image is required");
        }

        const webpBuffer = await compressImage(file);

        const fileName = `vendor-${vendorId}/profile/${crypto.randomUUID()}.webp`;

        await r2Client.send(
            new PutObjectCommand({
                Bucket: process.env.CLOUDFLARE_PUBLIC_BUCKET as string,
                Key: fileName,
                Body: webpBuffer,
                ContentType: "image/webp",
            })
        );

        return `https://media.${process.env.BASE_URL_DOMAIN}/${fileName}`;
    } catch (error: any) {
        throw new Error(error.message || "Profile image upload failed");
    }
};