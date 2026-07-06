import type { Request, Response } from "express";
import mongoose from "mongoose";
import { VendorAccountStatementService } from "../services/vendoraccountstatement.service.js";

export class VendorAccountStatementController {
    private service: VendorAccountStatementService;

    constructor() {
        this.service = new VendorAccountStatementService();
    }

    private getLoggedInUserId(req: Request) {
        const user: any = (req as any).user;

        return user?._id || user?.id || user?.userId;
    }

    private getPayloadStringValue(value: unknown): string | undefined {
        if (!value) {
            return undefined;
        }

        if (Array.isArray(value)) {
            return value[0] ? String(value[0]) : undefined;
        }

        return String(value);
    }

    getVendorAccountStatement = async (req: Request, res: Response) => {
        try {
            const vendorId = this.getLoggedInUserId(req);

            if (!vendorId || !mongoose.Types.ObjectId.isValid(String(vendorId))) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized vendor",
                });
            }

            const fromDate = this.getPayloadStringValue(req.body.fromDate);
            const toDate = this.getPayloadStringValue(req.body.toDate);
            const status = this.getPayloadStringValue(req.body.status);

            const page =
                Number(req.body.page) > 0 ? Number(req.body.page) : 1;

            const limit =
                Number(req.body.limit) > 0 ? Number(req.body.limit) : 10;

            const data = await this.service.getVendorAccountStatement({
                vendorId: String(vendorId),
                page,
                limit,
                ...(fromDate ? { fromDate } : {}),
                ...(toDate ? { toDate } : {}),
                ...(status ? { status } : {}),
            });

            return res.status(200).json({
                success: true,
                message: "Vendor account statement fetched successfully",
                data,
            });
        } catch (error: any) {
            const message =
                error?.message || "Failed to fetch vendor account statement";

            const statusCode =
                message.includes("Invalid date") ||
                    message.includes("Invalid date format") ||
                    message.includes("fromDate cannot")
                    ? 400
                    : 500;

            return res.status(statusCode).json({
                success: false,
                message,
            });
        }
    };

    exportVendorAccountStatementExcel = async (
        req: Request,
        res: Response
    ) => {
        try {
            const vendorId = this.getLoggedInUserId(req);

            if (!vendorId || !mongoose.Types.ObjectId.isValid(String(vendorId))) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized vendor",
                });
            }

            const fromDate = this.getPayloadStringValue(req.body.fromDate);
            const toDate = this.getPayloadStringValue(req.body.toDate);
            const status = this.getPayloadStringValue(req.body.status);

            const { buffer, fileName } =
                await this.service.exportVendorAccountStatementExcel({
                    vendorId: String(vendorId),
                    ...(fromDate ? { fromDate } : {}),
                    ...(toDate ? { toDate } : {}),
                    ...(status ? { status } : {}),
                });

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${fileName}"`
            );

            return res.status(200).send(buffer);
        } catch (error: any) {
            const message =
                error?.message || "Failed to export vendor account statement";

            const statusCode =
                message.includes("Invalid date") ||
                    message.includes("Invalid date format") ||
                    message.includes("fromDate cannot")
                    ? 400
                    : 500;

            return res.status(statusCode).json({
                success: false,
                message,
            });
        }
    };
}