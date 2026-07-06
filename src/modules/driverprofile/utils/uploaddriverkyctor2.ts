import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";
import { r2Client } from "../../../config/r2.config.js";

dotenv.config();

const allowedDocKeys = [
    "aadhaarCard",
    "panCard",
    "drivingLicense",
    "rcBook",
    "insurance",
    "vehiclePermit",
    "pollutionCertificate",
    "profilePhoto",
];

export const uploadDriverKycToR2 = async (
    files: Express.Multer.File[],
    driverId: string = ""
): Promise<Record<string, any>> => {
    try {
        const uploadedDocs: Record<string, any> = {};

        for (const file of files) {
            if (!file || !file.buffer) continue;

            const docKey = file.fieldname;

            if (!allowedDocKeys.includes(docKey)) {
                continue;
            }

            const originalExt = file.originalname?.split(".").pop();
            const safeExt = originalExt || "jpg";

            const fileKey = `driver-${driverId}/kyc/${docKey}-${crypto.randomUUID()}.${safeExt}`;

            await r2Client.send(
                new PutObjectCommand({
                    Bucket: process.env.CLOUDFLARE_DRIVER_DOCS_BUCKET as string,
                    Key: fileKey,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );

            const fileUrl = `https://media.${process.env.BASE_URL_DOMAIN}/${process.env.CLOUDFLARE_DRIVER_DOCS_BUCKET}/${fileKey}`;

            uploadedDocs[docKey] = {
                fileUrl,
                fileKey,
                originalName: file.originalname || "",
                mimeType: file.mimetype || "",
                status: "pending",
                adminRemark: "",
                updatedAt: new Date(),
            };
        }

        return uploadedDocs;
    } catch (error: any) {
        console.error("Driver KYC upload error:", error);
        throw new Error(error.message || "Driver KYC file upload failed");
    }
};