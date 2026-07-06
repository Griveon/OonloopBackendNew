import mongoose from "mongoose";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";

type VendorStatementFindParams = {
    vendorId: string;
    fromDate: Date;
    toDate: Date;
    skip: number;
    limit: number;
    status?: string;
};

type VendorStatementExportParams = {
    vendorId: string;
    fromDate: Date;
    toDate: Date;
    status?: string;
};

type VendorStatementSummaryParams = {
    vendorId: string;
    fromDate: Date;
    toDate: Date;
    status?: string;
};

type BuildMatchParams = {
    vendorId: string;
    fromDate: Date;
    toDate: Date;
    status?: string;
};

export class VendorAccountStatementRepository {
    private buildMatch(params: BuildMatchParams) {
        const match: any = {
            vendor: new mongoose.Types.ObjectId(params.vendorId),
            isActive: true,
            createdAt: {
                $gte: params.fromDate,
                $lte: params.toDate,
            },
        };

        if (params.status && params.status !== "all") {
            match.status = params.status;
        }

        return match;
    }

    async findVendorStatement(params: VendorStatementFindParams) {
        const match = this.buildMatch({
            vendorId: params.vendorId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            ...(params.status ? { status: params.status } : {}),
        });

        const [orders, total] = await Promise.all([
            OrderVendorModel.find(match)
                .select(
                    "_id orderNumber vendorOrderNumber items totalAmount status sellerStatus paymentStatus paymentMode createdAt deliveredAt cancelledAt returnedAt"
                )
                .sort({ createdAt: -1 })
                .skip(params.skip)
                .limit(params.limit)
                .lean(),

            OrderVendorModel.countDocuments(match),
        ]);

        return {
            orders,
            total,
        };
    }

    async findVendorStatementForExport(params: VendorStatementExportParams) {
        const match = this.buildMatch({
            vendorId: params.vendorId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            ...(params.status ? { status: params.status } : {}),
        });

        return await OrderVendorModel.find(match)
            .select(
                "_id orderNumber vendorOrderNumber items totalAmount status sellerStatus paymentStatus paymentMode createdAt deliveredAt cancelledAt returnedAt"
            )
            .sort({ createdAt: -1 })
            .lean();
    }

    async getVendorStatementSummary(params: VendorStatementSummaryParams) {
        const match = this.buildMatch({
            vendorId: params.vendorId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            ...(params.status ? { status: params.status } : {}),
        });

        const pendingStatuses = [
            "pending",
            "placed",
            "seller_accepted",
            "picking_products",
            "packing_order",
            "ready_for_pickup",
            "shipped",
        ];

        const summary = await OrderVendorModel.aggregate([
            {
                $match: match,
            },
            {
                $group: {
                    _id: null,

                    totalOrders: {
                        $sum: 1,
                    },

                    completedOrders: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "delivered"] }, 1, 0],
                        },
                    },

                    pendingOrders: {
                        $sum: {
                            $cond: [
                                {
                                    $in: ["$status", pendingStatuses],
                                },
                                1,
                                0,
                            ],
                        },
                    },

                    cancelledOrders: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
                        },
                    },

                    returnedOrders: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "returned"] }, 1, 0],
                        },
                    },

                    totalAmount: {
                        $sum: {
                            $ifNull: ["$totalAmount", 0],
                        },
                    },

                    completedAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: ["$status", "delivered"],
                                },
                                {
                                    $ifNull: ["$totalAmount", 0],
                                },
                                0,
                            ],
                        },
                    },

                    pendingAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $in: ["$status", pendingStatuses],
                                },
                                {
                                    $ifNull: ["$totalAmount", 0],
                                },
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalOrders: 1,
                    completedOrders: 1,
                    pendingOrders: 1,
                    cancelledOrders: 1,
                    returnedOrders: 1,
                    totalAmount: 1,
                    completedAmount: 1,
                    pendingAmount: 1,
                },
            },
        ]);

        return (
            summary[0] || {
                totalOrders: 0,
                completedOrders: 0,
                pendingOrders: 0,
                cancelledOrders: 0,
                returnedOrders: 0,
                totalAmount: 0,
                completedAmount: 0,
                pendingAmount: 0,
            }
        );
    }
}