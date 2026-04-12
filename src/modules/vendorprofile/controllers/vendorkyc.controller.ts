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

            const files: Express.Multer.File[] = Array.isArray(req.files)
                ? req.files
                : (req.files as any)?.kycDocuments || [];

            if (!files.length) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("No files uploaded"));
            }

            const uploadedDocs = await uploadVendorKycToR2(
                files,
                vendor._id.toString()
            );

            const updatedVendor = await this.service.upload(
                vendor._id.toString(),
                uploadedDocs
            );

            return res.status(201).json(
                ResponseUtil.created(
                    "KYC documents uploaded successfully",
                    updatedVendor!.kycDocuments
                )
            );
        } catch (error: any) {
            console.error(error);
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
                .json(ResponseUtil.success("KYC documents fetched", documents));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    deleteKycDocument = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const docKey: any = req.params.docKey;

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

            const deleted = await this.service.deleteKycDocument(
                userId,
                docKey
            );

            return res
                .status(200)
                .json(ResponseUtil.success("KYC document deleted", deleted));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };
}