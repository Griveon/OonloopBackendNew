import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { VendorKycService } from "../services/vendorkyc.service.js";
import { VendorProfileModel } from "../models/vendorprofile.model.js";
import { uploadVendorKycToR2 } from "../utils/uploadvendorkyctor2.js";

export class VendorKycController {
    private service: VendorKycService;

    constructor() {
        this.service = new VendorKycService();
    }

    upload = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("User not authenticated"));
            }

            const vendor = await VendorProfileModel.findOne({ user: userId });

            if (!vendor) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Vendor profile not found"));
            }

            let files: Express.Multer.File[] = [];

            if (Array.isArray(req.files)) {
                files = req.files;
            } else if (req.files && typeof req.files === "object") {
                files = Object.values(req.files).flat() as Express.Multer.File[];
            }

            if (!files.length) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("No files uploaded"));
            }

            const uploadedDocs = await uploadVendorKycToR2(
                files,
                vendor._id.toString()
            );

            if (!uploadedDocs || Object.keys(uploadedDocs).length === 0) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("No valid KYC documents uploaded"));
            }

            const updatedVendor = await this.service.upload(
                vendor._id.toString(),
                uploadedDocs
            );

            return res.status(201).json(
                ResponseUtil.created(
                    "Vendor KYC documents uploaded successfully",
                    {
                        vendorId: updatedVendor._id,
                        user: updatedVendor.user,
                        isKycSubmitted: updatedVendor.isKycSubmitted,
                        isKycApproved: updatedVendor.isKycApproved,
                        isVerified: updatedVendor.isVerified,
                        profileStatus: updatedVendor.profileStatus,
                        kycDocuments: updatedVendor.kycDocuments,
                    }
                )
            );
        } catch (error: any) {
            console.error("Vendor KYC upload error:", error);

            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    getKycDocuments = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("User not authenticated"));
            }

            const documents = await this.service.getKycDocuments(userId);

            return res
                .status(200)
                .json(ResponseUtil.success("Vendor KYC documents fetched", documents));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    getKycDocumentsWithPreview = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("User not authenticated"));
            }

            const documents = await this.service.getKycDocumentsWithPreview(userId);

            return res.status(200).json(
                ResponseUtil.success(
                    "Vendor KYC documents preview URLs fetched",
                    documents
                )
            );
        } catch (error: any) {
            console.error("Vendor KYC preview error:", error);

            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    deleteKycDocument = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const docKey = req.params.docKey;

            if (!userId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("User not authenticated"));
            }

            if (!docKey) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Document key is required"));
            }

            const deleted = await this.service.deleteKycDocument(userId, docKey);

            return res
                .status(200)
                .json(ResponseUtil.success("Vendor KYC document deleted", deleted));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    checkKycStatus = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("User not authenticated"));
            }

            const status = await this.service.checkKycStatus(userId);

            return res
                .status(200)
                .json(ResponseUtil.success("Vendor KYC status fetched", status));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };
}