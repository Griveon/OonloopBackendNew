import { DriverKycRepository } from "../repositories/driverkyc.repository.js";
import { getDriverKycPreviewUrl } from "../utils/getdriverkycpreviewurl.js";

const DOC_LABELS: Record<string, string> = {
    aadhaarCard: "Aadhaar Card",
    panCard: "PAN Card",
    drivingLicense: "Driving License",
    rcBook: "RC Book",
    insurance: "Vehicle Insurance",
    vehiclePermit: "Vehicle Permit",
    pollutionCertificate: "Pollution Certificate",
    profilePhoto: "Profile Photo",
};

export class DriverKycService {
    private repository: DriverKycRepository;

    constructor() {
        this.repository = new DriverKycRepository();
    }

    async upload(driverId: string, docs: Record<string, any>) {
        if (!driverId) {
            throw new Error("Driver profile id is required");
        }

        if (!docs || Object.keys(docs).length === 0) {
            throw new Error("No valid KYC documents found");
        }

        return await this.repository.updateKycDocuments(driverId, docs);
    }

    async getKycDocuments(userId: string) {
        if (!userId) {
            throw new Error("User id is required");
        }

        const driver = await this.repository.findByUserId(userId);

        return {
            kycDocuments: driver.kycDocuments,
            isKycSubmitted: driver.isKycSubmitted,
            isKycApproved: driver.isKycApproved,
            profileStatus: driver.profileStatus,
            isVerified: driver.isVerified,
        };
    }

    async getKycDocumentsWithPreview(userId: string) {
        if (!userId) {
            throw new Error("User id is required");
        }

        const driver: any = await this.repository.findFullKycByUserId(userId);

        const kycDocuments = driver.kycDocuments || {};
        const documents: any[] = [];

        for (const key of Object.keys(DOC_LABELS)) {
            const doc = kycDocuments?.[key];

            if (!doc) continue;

            let previewUrl = "";

            if (doc.fileKey) {
                previewUrl = await getDriverKycPreviewUrl(doc.fileKey, 60 * 10);
            }

            documents.push({
                key,
                label: DOC_LABELS[key],
                fileUrl: doc.fileUrl || "",
                fileKey: doc.fileKey || "",
                previewUrl,
                originalName: doc.originalName || "",
                mimeType: doc.mimeType || "",
                status: doc.status || "pending",
                adminRemark: doc.adminRemark || "",
                updatedAt: doc.updatedAt,
            });
        }

        return {
            driverId: driver._id,
            user: driver.user,
            isKycSubmitted: driver.isKycSubmitted,
            isKycApproved: driver.isKycApproved,
            profileStatus: driver.profileStatus,
            isVerified: driver.isVerified,
            previewExpiresIn: 600,
            documents,
        };
    }

    async deleteKycDocument(userId: string, docKey: string) {
        if (!userId) {
            throw new Error("User id is required");
        }

        if (!docKey) {
            throw new Error("Document key is required");
        }

        return await this.repository.removeDocument(userId, docKey);
    }

    async checkKycStatus(userId: string) {
        if (!userId) {
            throw new Error("User id is required");
        }

        const driver: any = await this.repository.findKycStatusByUserId(userId);

        const requiredDocs = [
            "aadhaarCard",
            "panCard",
            "drivingLicense",
            "rcBook",
            "insurance",
            "vehiclePermit",
            "pollutionCertificate",
            "profilePhoto",
        ];

        const kycDocuments = driver.kycDocuments || {};

        const documents = requiredDocs.map((key) => {
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
        const approvedDocuments = documents.filter((doc) => doc.status === "approved");
        const rejectedDocuments = documents.filter((doc) => doc.status === "rejected");
        const pendingDocuments = documents.filter((doc) => doc.status === "pending");
        const notUploadedDocuments = documents.filter((doc) => !doc.uploaded);

        const totalRequiredDocuments = requiredDocs.length;
        const uploadedCount = uploadedDocuments.length;
        const approvedCount = approvedDocuments.length;

        const completionPercentage = Math.round(
            (uploadedCount / totalRequiredDocuments) * 100
        );

        let kycStatus = "not_submitted";

        if (driver.isKycApproved && driver.isVerified && driver.profileStatus === "approved") {
            kycStatus = "approved";
        } else if (rejectedDocuments.length > 0 || driver.profileStatus === "rejected") {
            kycStatus = "rejected";
        } else if (driver.isKycSubmitted || uploadedCount > 0) {
            kycStatus = "pending";
        }

        return {
            kycStatus,
            isKycSubmitted: driver.isKycSubmitted,
            isKycApproved: driver.isKycApproved,
            isVerified: driver.isVerified,
            profileStatus: driver.profileStatus,

            totalRequiredDocuments,
            uploadedCount,
            approvedCount,
            pendingCount: pendingDocuments.length,
            rejectedCount: rejectedDocuments.length,
            notUploadedCount: notUploadedDocuments.length,
            completionPercentage,

            canAcceptOrders:
                driver.isKycApproved === true &&
                driver.isVerified === true &&
                driver.profileStatus === "approved",

            documents,
            pendingDocuments,
            rejectedDocuments,
            notUploadedDocuments,
        };
    }
}