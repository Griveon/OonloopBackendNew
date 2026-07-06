import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { DriverKycService } from "../services/driverkyc.service.js";
import { DriverProfileModel } from "../models/driverprofile.model.js";
import { uploadDriverKycToR2 } from "../utils/uploaddriverkyctor2.js";

export class DriverKycController {
    private service: DriverKycService;

    constructor() {
        this.service = new DriverKycService();
    }

    upload = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("User not authenticated"));
            }

            const driver = await DriverProfileModel.findOne({ user: userId });

            if (!driver) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Driver profile not found"));
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

            const uploadedDocs = await uploadDriverKycToR2(
                files,
                driver._id.toString()
            );

            if (!uploadedDocs || Object.keys(uploadedDocs).length === 0) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("No valid KYC documents uploaded"));
            }

            const updatedDriver = await this.service.upload(
                driver._id.toString(),
                uploadedDocs
            );

            return res.status(201).json(
                ResponseUtil.created(
                    "Driver KYC documents uploaded successfully",
                    updatedDriver!.kycDocuments
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
                .json(ResponseUtil.success("Driver KYC documents fetched", documents));
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

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Driver KYC documents preview URLs fetched",
                        documents
                    )
                );
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

            const deleted = await this.service.deleteKycDocument(userId, docKey);

            return res
                .status(200)
                .json(ResponseUtil.success("Driver KYC document deleted", deleted));
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
                .json(ResponseUtil.success("Driver KYC status fetched", status));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };
}