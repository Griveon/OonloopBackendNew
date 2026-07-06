import { VendorKycRepository } from "../repository/vendorkyc.repository.js";
import { getVendorKycPreviewUrl } from "../utils/getvendorkycpreviewurl.js";

const DOC_LABELS: Record<string, string> = {
    gstCertificate: "GST Certificate",
    panCard: "PAN Card",
    cancelledCheque: "Cancelled Cheque",
    storeRegistration: "Store Registration",
    aadhaarCard: "Aadhaar Card",
    tradeLicense: "Trade License",
    udyamAadhaar: "Udyam Aadhaar",
    shopActLicense: "Shop Act License",
    certificateOfIncorporation: "Certificate of Incorporation",
    other: "Other Document",
};

const REQUIRED_DOC_KEYS = [
    "gstCertificate",
    "panCard",
    "cancelledCheque",
    "storeRegistration",
    "aadhaarCard",
    "tradeLicense",
    "udyamAadhaar",
    "shopActLicense",
    "certificateOfIncorporation",
];

export class VendorKycService {
    private repository: VendorKycRepository;

    constructor() {
        this.repository = new VendorKycRepository();
    }

    async upload(vendorId: string, docs: Record<string, any>) {
        if (!vendorId) {
            throw new Error("Vendor profile id is required");
        }

        if (!docs || Object.keys(docs).length === 0) {
            throw new Error("No valid KYC documents found");
        }

        return await this.repository.updateKycDocuments(vendorId, docs);
    }

    async getKycDocuments(userId: string) {
        if (!userId) {
            throw new Error("User id is required");
        }

        const vendor: any = await this.repository.findByUserId(userId);

        return {
            vendorId: vendor._id,
            user: vendor.user,
            kycDocuments: vendor.kycDocuments || {},
            isKycSubmitted: vendor.isKycSubmitted,
            isKycApproved: vendor.isKycApproved,
            isVerified: vendor.isVerified,
            profileStatus: vendor.profileStatus,
        };
    }

    async getKycDocumentsWithPreview(userId: string) {
        if (!userId) {
            throw new Error("User id is required");
        }

        const vendor: any = await this.repository.findFullKycByUserId(userId);

        const kycDocuments = vendor.kycDocuments || {};
        const documents: any[] = [];

        for (const key of Object.keys(DOC_LABELS)) {
            const doc = kycDocuments?.[key];

            if (!doc?.fileUrl && !doc?.fileKey) continue;

            let previewUrl = doc?.fileUrl || "";
            let previewError = "";

            if (doc?.fileKey) {
                try {
                    previewUrl = await getVendorKycPreviewUrl(doc.fileKey, 60 * 10);
                } catch (err: any) {
                    previewError = err?.message || "Preview URL failed";

                    console.warn("Vendor KYC preview failed:", {
                        key,
                        fileKey: doc.fileKey,
                        error: previewError,
                    });
                }
            }

            documents.push({
                key,
                label: DOC_LABELS[key],
                fileUrl: doc.fileUrl || "",
                fileKey: doc.fileKey || "",
                previewUrl,
                previewError,
                originalName: doc.originalName || "",
                mimeType: doc.mimeType || "",
                status: doc.status || "pending",
                adminRemark: doc.adminRemark || "",
                updatedAt: doc.updatedAt || null,
            });
        }

        return {
            vendorId: vendor._id,
            user: vendor.user,
            isKycSubmitted: vendor.isKycSubmitted,
            isKycApproved: vendor.isKycApproved,
            isVerified: vendor.isVerified,
            profileStatus: vendor.profileStatus,
            previewExpiresIn: 600,
            documents,
        };
    }

    async deleteKycDocument(userId: string, docKey: any) {
        if (!userId) {
            throw new Error("User id is required");
        }

        if (!docKey) {
            throw new Error("Document key is required");
        }

        if (!DOC_LABELS[docKey]) {
            throw new Error("Invalid document key");
        }

        return await this.repository.removeDocument(userId, docKey);
    }

    async checkKycStatus(userId: string) {
        if (!userId) {
            throw new Error("User id is required");
        }

        const vendor: any = await this.repository.findKycStatusByUserId(userId);

        const kycDocuments = vendor.kycDocuments || {};

        const documents = REQUIRED_DOC_KEYS.map((key) => {
            const doc = kycDocuments?.[key];

            return {
                key,
                label: DOC_LABELS[key],
                uploaded: !!doc?.fileUrl,
                status: doc?.status || "not_uploaded",
                adminRemark: doc?.adminRemark || "",
                updatedAt: doc?.updatedAt || null,
            };
        });

        const uploadedDocuments = documents.filter((doc) => doc.uploaded);
        const approvedDocuments = documents.filter(
            (doc) => doc.status === "approved"
        );
        const rejectedDocuments = documents.filter(
            (doc) => doc.status === "rejected"
        );
        const pendingDocuments = documents.filter(
            (doc) => doc.status === "pending"
        );
        const notUploadedDocuments = documents.filter((doc) => !doc.uploaded);

        const totalRequiredDocuments = REQUIRED_DOC_KEYS.length;
        const uploadedCount = uploadedDocuments.length;
        const approvedCount = approvedDocuments.length;

        const completionPercentage = Math.round(
            (uploadedCount / totalRequiredDocuments) * 100
        );

        let kycStatus = "not_submitted";

        if (
            vendor.isKycApproved === true &&
            vendor.isVerified === true &&
            vendor.profileStatus === "approved"
        ) {
            kycStatus = "approved";
        } else if (
            rejectedDocuments.length > 0 ||
            vendor.profileStatus === "rejected"
        ) {
            kycStatus = "rejected";
        } else if (vendor.isKycSubmitted === true || uploadedCount > 0) {
            kycStatus = "pending";
        }

        return {
            kycStatus,
            isKycSubmitted: vendor.isKycSubmitted,
            isKycApproved: vendor.isKycApproved,
            isVerified: vendor.isVerified,
            profileStatus: vendor.profileStatus,

            totalRequiredDocuments,
            uploadedCount,
            approvedCount,
            pendingCount: pendingDocuments.length,
            rejectedCount: rejectedDocuments.length,
            notUploadedCount: notUploadedDocuments.length,
            completionPercentage,

            canSell:
                vendor.isKycApproved === true &&
                vendor.isVerified === true &&
                vendor.profileStatus === "approved",

            documents,
            pendingDocuments,
            rejectedDocuments,
            notUploadedDocuments,
        };
    }
}