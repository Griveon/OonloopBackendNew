import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { VendorProfileService } from "../services/vendorprofile.service.js";
import { uploadToR2 } from "../utils/vendorprofile.util.js";

export class VendorProfileController {
    private vendorService: VendorProfileService;

    constructor() {
        this.vendorService = new VendorProfileService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    // ✅ CREATE
    createVendor = async (req: Request, res: Response) => {
        try {
            const vendor = await this.vendorService.createVendor(req.body);
            return res.status(201).json(
                ResponseUtil.created("Vendor created successfully", vendor)
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // ✅ SUBMIT KYC
    submitKyc = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Vendor ID is required"));

            const files = req.files as Record<string, Express.Multer.File[]>;
            if (!files || Object.keys(files).length === 0)
                return res.status(400).json(ResponseUtil.badRequest("At least one document is required"));

            const fileKeys = [
                { field: "panCard", folder: "kyc/pan" },
                { field: "gstCertificate", folder: "kyc/gst" },
                { field: "cancelledCheque", folder: "kyc/cheque" },
                { field: "storeRegistration", folder: "kyc/storeReg" },
                { field: "aadhaarCard", folder: "kyc/aadhaar" },
                { field: "tradeLicense", folder: "kyc/tradeLicense" },
                { field: "udyamAadhaar", folder: "kyc/udyamAadhaar" },
                { field: "shopActLicense", folder: "kyc/shopActLicense" },
                { field: "certificateOfIncorporation", folder: "kyc/certificate" },
            ];

            const kycDocuments: any = {};
            for (const f of fileKeys) {
                const file = files?.[f.field]?.[0];
                if (!file) continue;
                const fileUrl = await uploadToR2(file, f.folder);
                kycDocuments[f.field] = { fileUrl, status: "pending" };
            }

            const vendor = await this.vendorService.submitKyc(id, { kycDocuments });
            return res.status(200).json(ResponseUtil.success("KYC submitted successfully", vendor));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // ✅ GET BY ID
    getVendorById = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Vendor ID is required")
                );
            }

            const data = await this.vendorService.getVendorById(id);

            return res.status(200).json(
                ResponseUtil.success("Vendor fetched successfully", data)
            );
        } catch (error: any) {
            return res.status(404).json(
                ResponseUtil.notFound(error.message)
            );
        }
    };

    // ✅ GET ALL
    getAllVendors = async (req: Request, res: Response) => {
        try {
            const page = parseInt((req.query.page as string) || "1", 10);
            const limit = parseInt((req.query.limit as string) || "10", 10);
            const search = (req.query.search as string) || "";

            const { vendors, total } = await this.vendorService.getAllVendors({ page, limit, search });
            return res.status(200).json(ResponseUtil.paginated("Vendors fetched successfully", vendors, page, limit, total));
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    // ✅ UPDATE
    updateVendor = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Vendor ID is required"));
            console.log(req.body);
            const vendor = await this.vendorService.updateVendor(id, req.body);
            return res.status(200).json(ResponseUtil.success("Vendor updated successfully", vendor));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // ✅ DELETE
    deleteVendor = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Vendor ID is required"));

            await this.vendorService.deleteVendor(id);
            return res.status(200).json(ResponseUtil.success("Vendor deleted successfully", {}));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    // ✅ APPROVE / REJECT KYC
    approveKyc = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Vendor ID is required"));

            const vendor = await this.vendorService.approveKyc(id);
            return res.status(200).json(ResponseUtil.success("KYC approved", vendor));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    rejectKyc = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Vendor ID is required"));

            const vendor = await this.vendorService.rejectKyc(id);
            return res.status(200).json(ResponseUtil.success("KYC rejected", vendor));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    checkProfileCompleted = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Vendor ID is required"));

            const result = await this.vendorService.isProfileCompleted(id);
            return res.status(200).json(ResponseUtil.success(result.message, result));
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    checkKYCStatus = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("User ID is required"));
            }

            const result = await this.vendorService.getKYCStatusByUser(id);

            return res
                .status(200)
                .json(ResponseUtil.success(result.message, result));
        } catch (error: any) {
            console.error(error);
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };
}