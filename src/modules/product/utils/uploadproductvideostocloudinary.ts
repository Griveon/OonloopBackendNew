import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import { r2Client } from "../../../config/r2.config.js";
import { compressVideo } from "../../../utils/videocompression.util.js";

dotenv.config();

export const uploadProductVideosToR2 = async (
    files: Express.Multer.File[],
    vendorId: any = ""
): Promise<any[]> => {
    try {
        const uploaded: any[] = [];

        for (const file of files) {
            if (!file || !file.buffer) continue;

            const outputPath = await compressVideo(file);

            const videoBuffer = fs.readFileSync(outputPath);

            const fileName = `vendor-${vendorId}/products/${crypto.randomUUID()}.mp4`;

            await r2Client.send(
                new PutObjectCommand({
                    Bucket: process.env.CLOUDFLARE_PUBLIC_BUCKET as string,
                    Key: fileName,
                    Body: videoBuffer,
                    ContentType: "video/mp4",
                })
            );

            const url = `https://media.${process.env.BASE_URL_DOMAIN}/${fileName}`;

            uploaded.push({
                url,
                name: file.originalname || "",
                type: "video",
            });

            fs.unlinkSync(outputPath);
        }

        return uploaded;
    } catch (error: any) {
        throw new Error(error.message || "Video upload failed");
    }
};