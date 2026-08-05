import type {
    Request,
    Response,
} from "express";

import {
    ResponseUtil,
} from "../../../utils/response.util.js";

import {
    UserReportService,
} from "../services/userreport.service.js";

export class UserReportController {

    private userReportService:
        UserReportService;

    constructor() {
        this.userReportService =
            new UserReportService();
    }

    /**
     * Get paginated users report.
     *
     * GET /user-reports/users
     */
    getUsersReport = async (
        req: Request,
        res: Response
    ) => {
        try {
            const result =
                await this.userReportService.getUsersReport(
                    req.query
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Users report fetched successfully",
                    result
                )
            );
        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(
                    error?.message ||
                    "Unable to fetch users report"
                )
            );
        }
    };

    /**
     * Get users report summary.
     *
     * GET /user-reports/users/summary
     */
    getUsersSummary = async (
        _req: Request,
        res: Response
    ) => {
        try {
            const result =
                await this.userReportService.getUsersSummary();

            return res.status(200).json(
                ResponseUtil.success(
                    "Users report summary fetched successfully",
                    result
                )
            );
        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(
                    error?.message ||
                    "Unable to fetch users report summary"
                )
            );
        }
    };

    /**
     * Download users report as CSV.
     *
     * GET /user-reports/users/download
     */
    downloadUsersReport = async (
        req: Request,
        res: Response
    ) => {
        try {
            const csv =
                await this.userReportService.exportUsersCsv(
                    req.query
                );

            const date =
                new Date()
                    .toISOString()
                    .slice(0, 10);

            const fileName =
                `users-report-${date}.csv`;

            res.setHeader(
                "Content-Type",
                "text/csv; charset=utf-8"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${fileName}"`
            );

            res.setHeader(
                "Cache-Control",
                "no-store, no-cache, must-revalidate, private"
            );

            return res
                .status(200)
                .send(csv);
        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(
                    error?.message ||
                    "Unable to download users report"
                )
            );
        }
    };
}