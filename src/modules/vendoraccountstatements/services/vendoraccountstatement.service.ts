import ExcelJS from "exceljs";
import { VendorAccountStatementRepository } from "../repositories/vendoraccountstatement.repository.js";

type GetVendorAccountStatementParams = {
    vendorId: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    page?: number;
    limit?: number;
};

type ExportVendorAccountStatementParams = {
    vendorId: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
};

export class VendorAccountStatementService {
    private repo: VendorAccountStatementRepository;

    constructor() {
        this.repo = new VendorAccountStatementRepository();
    }

    private parseMMDDYYYY(dateValue?: string, endOfDay = false): Date {
        if (!dateValue) {
            const today = new Date();

            if (endOfDay) {
                today.setHours(23, 59, 59, 999);
            } else {
                today.setHours(0, 0, 0, 0);
            }

            return today;
        }

        const parts = dateValue.split("-");

        if (parts.length !== 3) {
            throw new Error("Invalid date format. Use MM-DD-YYYY");
        }

        const month = Number(parts[0]);
        const day = Number(parts[1]);
        const year = Number(parts[2]);

        if (!month || !day || !year) {
            throw new Error("Invalid date format. Use MM-DD-YYYY");
        }

        const date = new Date(year, month - 1, day);

        const isValidDate =
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;

        if (Number.isNaN(date.getTime()) || !isValidDate) {
            throw new Error("Invalid date");
        }

        if (endOfDay) {
            date.setHours(23, 59, 59, 999);
        } else {
            date.setHours(0, 0, 0, 0);
        }

        return date;
    }

    private formatDate(dateValue: Date): string {
        const date = new Date(dateValue);

        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();

        return `${month}-${day}-${year}`;
    }

    private cleanStatus(status?: string): string | undefined {
        if (!status || status === "all") {
            return undefined;
        }

        return status;
    }

    private getNoOfProducts(items: any[]): number {
        if (!Array.isArray(items)) {
            return 0;
        }

        return items.reduce((sum, item) => {
            return sum + Number(item?.quantity || 0);
        }, 0);
    }

    private mapOrder(order: any) {
        return {
            date: this.formatDate(order.createdAt),
            orderId: order.orderNumber || "",
            vendorOrderNumber: order.vendorOrderNumber || "",
            noOfProducts: this.getNoOfProducts(order.items),
            amount: Number(order.totalAmount || 0),
            orderStatus: order.status || "",
            sellerStatus: order.sellerStatus || "",
            paymentStatus: order.paymentStatus || "",
            paymentMode: order.paymentMode || "",
        };
    }

    async getVendorAccountStatement(params: GetVendorAccountStatementParams) {
        const safePage = Number(params.page) > 0 ? Number(params.page) : 1;
        const safeLimit = Number(params.limit) > 0 ? Number(params.limit) : 10;
        const skip = (safePage - 1) * safeLimit;

        const fromDate = this.parseMMDDYYYY(params.fromDate, false);
        const toDate = this.parseMMDDYYYY(params.toDate || params.fromDate, true);
        const status = this.cleanStatus(params.status);

        if (fromDate > toDate) {
            throw new Error("fromDate cannot be greater than toDate");
        }

        const repoBaseParams = {
            vendorId: params.vendorId,
            fromDate,
            toDate,
            ...(status ? { status } : {}),
        };

        const [{ orders, total }, summary] = await Promise.all([
            this.repo.findVendorStatement({
                ...repoBaseParams,
                skip,
                limit: safeLimit,
            }),

            this.repo.getVendorStatementSummary(repoBaseParams),
        ]);

        return {
            filters: {
                fromDate: this.formatDate(fromDate),
                toDate: this.formatDate(toDate),
                status: status || "all",
            },
            summary,
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
            statements: orders.map((order) => this.mapOrder(order)),
        };
    }

    async exportVendorAccountStatementExcel(
        params: ExportVendorAccountStatementParams
    ) {
        const fromDate = this.parseMMDDYYYY(params.fromDate, false);
        const toDate = this.parseMMDDYYYY(params.toDate || params.fromDate, true);
        const status = this.cleanStatus(params.status);

        if (fromDate > toDate) {
            throw new Error("fromDate cannot be greater than toDate");
        }

        const repoBaseParams = {
            vendorId: params.vendorId,
            fromDate,
            toDate,
            ...(status ? { status } : {}),
        };

        const [orders, summary] = await Promise.all([
            this.repo.findVendorStatementForExport(repoBaseParams),
            this.repo.getVendorStatementSummary(repoBaseParams),
        ]);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Vendor Statement");

        worksheet.mergeCells("A1:I1");
        worksheet.getCell("A1").value = "Vendor Account Statement";
        worksheet.getCell("A1").font = {
            bold: true,
            size: 16,
        };
        worksheet.getCell("A1").alignment = {
            horizontal: "center",
            vertical: "middle",
        };

        worksheet.addRow([]);

        worksheet.addRow(["From Date", this.formatDate(fromDate)]);
        worksheet.addRow(["To Date", this.formatDate(toDate)]);
        worksheet.addRow(["Status", status || "all"]);
        worksheet.addRow([]);

        const summaryTitleRow = worksheet.addRow(["Summary"]);
        summaryTitleRow.font = {
            bold: true,
        };

        worksheet.addRow(["Total Orders", summary.totalOrders]);
        worksheet.addRow(["Completed Orders", summary.completedOrders]);
        worksheet.addRow(["Pending Orders", summary.pendingOrders]);
        worksheet.addRow(["Cancelled Orders", summary.cancelledOrders]);
        worksheet.addRow(["Returned Orders", summary.returnedOrders]);
        worksheet.addRow(["Total Amount", summary.totalAmount]);
        worksheet.addRow(["Completed Amount", summary.completedAmount]);
        worksheet.addRow(["Pending Amount", summary.pendingAmount]);
        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            "Date",
            "Order ID",
            "Vendor Order ID",
            "No Of Products",
            "Amount",
            "Order Status",
            "Seller Status",
            "Payment Status",
            "Payment Mode",
        ]);

        headerRow.font = {
            bold: true,
        };

        orders.forEach((order: any) => {
            const row = this.mapOrder(order);

            worksheet.addRow([
                row.date,
                row.orderId,
                row.vendorOrderNumber,
                row.noOfProducts,
                row.amount,
                row.orderStatus,
                row.sellerStatus,
                row.paymentStatus,
                row.paymentMode,
            ]);
        });

        worksheet.columns = [
            { width: 15 },
            { width: 25 },
            { width: 25 },
            { width: 18 },
            { width: 15 },
            { width: 20 },
            { width: 24 },
            { width: 18 },
            { width: 15 },
        ];

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = {
                    vertical: "middle",
                };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        return {
            buffer,
            fileName: `vendor-account-statement-${this.formatDate(
                fromDate
            )}-to-${this.formatDate(toDate)}.xlsx`,
        };
    }
}