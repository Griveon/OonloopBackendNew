import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";
import { r2Client } from "../../../config/r2.config.js";
import { compressImage } from "../../../utils/imageCompression.util.js";

dotenv.config();

export const uploadVendorStoreImageToR2 = async (
    file: Express.Multer.File,
    vendorId: string
): Promise<string> => {

    const webpBuffer = await compressImage(file);

    const fileName =
        `vendor-${vendorId}/store/${crypto.randomUUID()}.webp`;

    await r2Client.send(
        new PutObjectCommand({
            Bucket: process.env.CLOUDFLARE_PUBLIC_BUCKET!,
            Key: fileName,
            Body: webpBuffer,
            ContentType: "image/webp",
        })
    );

    return `https://media.${process.env.BASE_URL_DOMAIN}/${fileName}`;
};

export const deleteVendorAssetFromR2 = async (
    url: string
) => {

    const key = url.split(`media.${process.env.BASE_URL_DOMAIN}/`)[1];

    if (!key) return;

    await r2Client.send(
        new DeleteObjectCommand({
            Bucket: process.env.CLOUDFLARE_PUBLIC_BUCKET!,
            Key: key,
        })
    );
};