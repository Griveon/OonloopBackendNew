import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";
import { r2Client } from "../../../config/r2.config.js";

dotenv.config();

const allowedDocKeys = [
    "gstCertificate",
    "panCard",
    "cancelledCheque",
    "storeRegistration",
    "aadhaarCard",
    "tradeLicense",
    "udyamAadhaar",
    "shopActLicense",
    "certificateOfIncorporation",
    "other",
];

export const uploadVendorKycToR2 = async (
    files: Express.Multer.File[],
    vendorId: string = ""
): Promise<Record<string, any>> => {
    try {
        const uploadedDocs: Record<string, any> = {};

        const bucket = process.env.CLOUDFLARE_VENDOR_KYC_DOCS_BUCKET;
        const domain = process.env.BASE_URL_DOMAIN;

        if (!bucket) {
            throw new Error("CLOUDFLARE_VENDOR_KYC_DOCS_BUCKET is required");
        }

        if (!domain) {
            throw new Error("BASE_URL_DOMAIN is required");
        }

        if (!vendorId) {
            throw new Error("Vendor profile id is required");
        }

        for (const file of files) {
            if (!file || !file.buffer) continue;

            const docKey = file.fieldname;

            if (!allowedDocKeys.includes(docKey)) {
                console.log("Skipped invalid vendor KYC field:", docKey);
                continue;
            }

            const originalExt = file.originalname?.split(".").pop();
            const safeExt = originalExt || "jpg";

            const fileKey = `vendor-${vendorId}/kyc/${docKey}-${crypto.randomUUID()}.${safeExt}`;

            await r2Client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: fileKey,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );

            const fileUrl = `https://media.${domain}/${bucket}/${fileKey}`;

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
        console.error("Vendor KYC upload error:", error);
        throw new Error(error.message || "Vendor KYC file upload failed");
    }
};