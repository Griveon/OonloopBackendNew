import {
    Types,
} from "mongoose";

import type {
    QueryFilter,
} from "mongoose";

import {
    OrderModel,
} from "../models/order.model.js";

import type {
    IOrderDocument,
} from "../interfaces/order.interface.js";

import type {
    IAdminOrderFilters,
    IAdminOrderFinancialSummary,
    IAdminOrderFulfillmentSummary,
} from "../interfaces/adminorders.interface.js";

import type {
    IOrderVendorDocument,
} from "../../vendororder/interfaces/vendororder.interface.js";

import {
    OrderVendorModel,
} from "../../vendororder/models/vendororder.model.js";


export class AdminOrdersRepository {

    /**
     * ========================================================
     * ADMIN ORDER LIST
     * ========================================================
     *
     * OrderModel
     * ----------
     * Parent/customer checkout order.
     *
     * Responsible for:
     * - payment
     * - customer
     * - checkout totals
     * - overall order status
     *
     *
     * OrderVendorModel
     * ----------------
     * Operational fulfillment order.
     *
     * Responsible for:
     * - vendor
     * - seller status
     * - driver
     * - delivery status
     * - fulfillment tracking
     *
     *
     * Admin list always paginates OrderModel.
     *
     * OrderVendor documents are attached under:
     *
     * order.vendorOrders[]
     */
    async findAll(
        filters: IAdminOrderFilters,
    ) {
        const parentFilter =
            this.buildParentFilter(
                filters,
            );

        const vendorFilter =
            this.buildVendorOrderFilter(
                filters,
            );

        const parentAndConditions:
            QueryFilter<IOrderDocument>[] = [];


        /**
         * ====================================================
         * CHILD / OPERATIONAL FILTERS
         * ====================================================
         *
         * Example:
         *
         * vendorId=...
         * deliveryStatus=out_for_delivery
         * sellerStatus=accepted
         *
         * First find matching OrderVendor documents.
         *
         * Then restrict parent Order documents
         * to those parentOrder IDs.
         */
        if (
            this.hasConditions(
                vendorFilter,
            )
        ) {
            const matchingParentIds =
                await OrderVendorModel.distinct(
                    "parentOrder",
                    vendorFilter,
                );


            if (
                matchingParentIds.length ===
                0
            ) {
                parentAndConditions.push({
                    _id: {
                        $in: [],
                    },
                });
            } else {
                parentAndConditions.push({
                    _id: {
                        $in:
                            matchingParentIds,
                    },
                });
            }
        }


        /**
         * ====================================================
         * SEARCH
         * ====================================================
         *
         * Search both:
         *
         * Parent order
         * +
         * Vendor fulfillment order
         */
        const normalizedSearch =
            filters.search
                ?.trim();


        if (
            normalizedSearch
        ) {
            const safeSearch =
                this.escapeRegex(
                    normalizedSearch,
                );


            const parentSearchConditions =
                this.buildParentSearchConditions(
                    safeSearch,
                );


            /**
             * If vendor filters are already
             * present, search must respect
             * those filters too.
             */
            const vendorSearchFilter:
                QueryFilter<IOrderVendorDocument> = {
                ...vendorFilter,

                $or:
                    this.buildVendorOrderSearchConditions(
                        safeSearch,
                    ),
            };


            const matchingSearchParentIds =
                await OrderVendorModel.distinct(
                    "parentOrder",
                    vendorSearchFilter,
                );


            parentAndConditions.push({
                $or: [
                    ...parentSearchConditions,

                    {
                        _id: {
                            $in:
                                matchingSearchParentIds,
                        },
                    },
                ],
            });
        }


        /**
         * Do not mutate parentFilter.$and directly.
         *
         * Mongoose 9 QueryFilter typing is stricter.
         *
         * Building a final filter like this is both
         * cleaner and type-safe.
         */
        const finalParentFilter:
            QueryFilter<IOrderDocument> =
            parentAndConditions.length > 0
                ? {
                    $and: [
                        parentFilter,
                        ...parentAndConditions,
                    ],
                }
                : parentFilter;


        const sortDirection:
            1 | -1 =
            filters.sortOrder ===
                "asc"
                ? 1
                : -1;


        const sort:
            Record<
                string,
                1 | -1
            > = {
            [filters.sortBy]:
                sortDirection,

            /**
             * Stable pagination.
             */
            _id:
                sortDirection,
        };


        const skip =
            (
                filters.page -
                1
            )
            *
            filters.limit;


        /**
         * Financial information always comes
         * from OrderModel.
         *
         * NEVER calculate total revenue by
         * summing OrderVendor.totalAmount.
         *
         * Otherwise multi-vendor orders could
         * be counted multiple times.
         */
        const [
            parentOrders,
            total,
            summary,
        ] =
            await Promise.all([
                this.findParentOrders(
                    finalParentFilter,
                    sort,
                    skip,
                    filters.limit,
                ),

                OrderModel.countDocuments(
                    finalParentFilter,
                ),

                this.getFinancialSummary(
                    finalParentFilter,
                ),
            ]);


        if (
            parentOrders.length ===
            0
        ) {
            return {
                orders: [],
                total,
                summary,
            };
        }


        /**
         * Load ALL operational children for
         * the returned parent orders.
         *
         * Even when one child matched the filter,
         * the admin should see the entire
         * fulfillment structure.
         */
        const parentIds =
            parentOrders.map(
                order =>
                    order._id,
            );


        const vendorOrders =
            await this.findVendorOrdersForParents(
                parentIds,
            );


        const vendorOrdersByParent =
            this.groupVendorOrdersByParent(
                vendorOrders,
            );


        const orders =
            parentOrders.map(
                (
                    parentOrder:
                        any,
                ) => {
                    const children =
                        vendorOrdersByParent.get(
                            parentOrder
                                ._id
                                .toString(),
                        )
                        || [];


                    return {
                        ...parentOrder,


                        /**
                         * Parent checkout item count.
                         */
                        totalItems:
                            this.calculateTotalItems(
                                parentOrder.items,
                            ),


                        /**
                         * Fulfillment / vendor orders.
                         */
                        vendorOrders:
                            children.map(
                                (
                                    vendorOrder:
                                        any,
                                ) => ({
                                    ...vendorOrder,

                                    totalItems:
                                        this.calculateTotalItems(
                                            vendorOrder.items,
                                        ),
                                }),
                            ),


                        /**
                         * Admin-friendly operational
                         * summary.
                         */
                        fulfillment:
                            this.buildFulfillmentSummary(
                                parentOrder,
                                children,
                            ),
                    };
                },
            );


        return {
            orders,
            total,
            summary,
        };
    }


    /**
     * ========================================================
     * GET COMPLETE ADMIN ORDER DETAIL
     * ========================================================
     */
    async findById(
        orderId: string,
    ) {
        if (
            !Types.ObjectId.isValid(
                orderId,
            )
        ) {
            return null;
        }


        const parentOrder =
            await this.findParentOrderById(
                orderId,
            );


        if (
            !parentOrder
        ) {
            return null;
        }


        const vendorOrders =
            await this.findVendorOrdersForParents(
                [
                    parentOrder._id,
                ],
            );


        return {
            ...parentOrder,

            totalItems:
                this.calculateTotalItems(
                    parentOrder.items,
                ),

            vendorOrders:
                vendorOrders.map(
                    (
                        vendorOrder:
                            any,
                    ) => ({
                        ...vendorOrder,

                        totalItems:
                            this.calculateTotalItems(
                                vendorOrder.items,
                            ),
                    }),
                ),

            fulfillment:
                this.buildFulfillmentSummary(
                    parentOrder,
                    vendorOrders,
                ),
        };
    }


    /**
     * ========================================================
     * PARENT ORDER LIST
     * ========================================================
     */
    private async findParentOrders(
        filter:
            QueryFilter<IOrderDocument>,

        sort:
            Record<
                string,
                1 | -1
            >,

        skip:
            number,

        limit:
            number,
    ) {
        return OrderModel
            .find(
                filter,
            )

            .sort(
                sort,
            )

            .skip(
                skip,
            )

            .limit(
                limit,
            )


            /**
             * Customer.
             */
            .populate({
                path:
                    "user",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            /**
             * Parent-order single vendor.
             */
            .populate({
                path:
                    "vendor",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            /**
             * Parent multi-vendor snapshot.
             */
            .populate({
                path:
                    "vendors",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            /**
             * Vendor recorded against original
             * checkout item.
             */
            .populate({
                path:
                    "items.vendor",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            /**
             * Current product information.
             *
             * Order item itself still contains the
             * original name/price/SKU snapshot.
             */
            .populate({
                path:
                    "items.product",

                select: [
                    "_id",
                    "name",
                    "slug",
                    "sku",
                    "images",
                    "status",
                ].join(
                    " ",
                ),
            })


            .populate({
                path:
                    "paymentMethod",
            })


            .populate({
                path:
                    "paymentTransaction",
            })


            .lean();
    }


    /**
     * ========================================================
     * SINGLE PARENT ORDER
     * ========================================================
     */
    private async findParentOrderById(
        orderId: string,
    ) {
        return OrderModel
            .findById(
                orderId,
            )


            .populate({
                path:
                    "user",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            .populate({
                path:
                    "vendor",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            .populate({
                path:
                    "vendors",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            .populate({
                path:
                    "items.vendor",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            .populate({
                path:
                    "items.product",
            })


            .populate({
                path:
                    "paymentMethod",
            })


            .populate({
                path:
                    "paymentTransaction",
            })


            .lean();
    }


    /**
     * ========================================================
     * LOAD OPERATIONAL VENDOR ORDERS
     * ========================================================
     */
    private async findVendorOrdersForParents(
        parentIds: any[],
    ) {
        if (
            parentIds.length ===
            0
        ) {
            return [];
        }


        return OrderVendorModel
            .find({
                parentOrder: {
                    $in:
                        parentIds,
                },
            })


            /**
             * Current/active fulfillment first.
             *
             * Historical/reassigned records are
             * still returned below them.
             */
            .sort({
                isActive:
                    -1,

                createdAt:
                    1,
            })


            /**
             * Customer.
             */
            .populate({
                path:
                    "user",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            /**
             * Current operational vendor.
             */
            .populate({
                path:
                    "vendor",

                select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "name",
                    "email",
                    "phone",
                    "mobile",
                    "status",
                ].join(
                    " ",
                ),
            })


            /**
             * Driver Profile -> User.
             */
            .populate({
                path:
                    "driver",

                populate: {
                    path:
                        "user",

                    select: [
                        "_id",
                        "firstName",
                        "lastName",
                        "name",
                        "email",
                        "phone",
                        "mobile",
                    ].join(
                        " ",
                    ),
                },
            })


            /**
             * Product.
             */
            .populate({
                path:
                    "items.product",

                select: [
                    "_id",
                    "name",
                    "slug",
                    "sku",
                    "images",
                    "status",
                ].join(
                    " ",
                ),
            })


            .populate({
                path:
                    "paymentMethod",
            })


            .populate({
                path:
                    "paymentTransaction",
            })


            /**
             * IMPORTANT:
             *
             * Pickup OTP / QR and delivery OTP
             * stay excluded because your schema
             * marks them select:false.
             *
             * Do not expose OTPs in this normal
             * admin listing API.
             */
            .lean();
    }


    /**
     * ========================================================
     * PARENT ORDER FILTER
     * ========================================================
     */
    private buildParentFilter(
        filters:
            IAdminOrderFilters,
    ): QueryFilter<IOrderDocument> {
        /**
         * Use Record internally because Mongoose 9
         * QueryFilter is intentionally stricter.
         *
         * Return it as QueryFilter after constructing
         * only known valid Mongo conditions.
         */
        const query:
            Record<
                string,
                any
            > = {};


        if (
            filters.status
        ) {
            query.status = {
                $in:
                    this.splitValues(
                        filters.status,
                    ),
            };
        }


        if (
            filters.paymentStatus
        ) {
            query.paymentStatus = {
                $in:
                    this.splitValues(
                        filters.paymentStatus,
                    ),
            };
        }


        if (
            filters.paymentMode
        ) {
            query.paymentMode = {
                $in:
                    this.splitValues(
                        filters.paymentMode,
                    ),
            };
        }


        if (
            filters.orderType
        ) {
            query.orderType = {
                $in:
                    this.splitValues(
                        filters.orderType,
                    ),
            };
        }


        if (
            filters.userId
        ) {
            query.user =
                new Types.ObjectId(
                    filters.userId,
                );
        }


        if (
            filters.paymentMethodId
        ) {
            query.paymentMethod =
                new Types.ObjectId(
                    filters.paymentMethodId,
                );
        }


        if (
            filters.paymentTransactionId
        ) {
            query.paymentTransaction =
                new Types.ObjectId(
                    filters.paymentTransactionId,
                );
        }


        if (
            filters.isActive !==
            undefined
        ) {
            query.isActive =
                filters.isActive;
        }


        /**
         * Parent checkout amount.
         */
        if (
            filters.minAmount !==
            undefined
            ||
            filters.maxAmount !==
            undefined
        ) {
            const amount:
                Record<
                    string,
                    number
                > = {};


            if (
                filters.minAmount !==
                undefined
            ) {
                amount.$gte =
                    filters.minAmount;
            }


            if (
                filters.maxAmount !==
                undefined
            ) {
                amount.$lte =
                    filters.maxAmount;
            }


            query.totalAmount =
                amount;
        }


        /**
         * Parent order creation date.
         *
         * DEFAULT BEHAVIOUR:
         * When the admin does not send fromDate/toDate,
         * return only TODAY'S orders.
         *
         * This keeps the admin order screen operationally useful
         * instead of loading the entire order history by default.
         *
         * ADMIN_ORDER_TIMEZONE_OFFSET_MINUTES defaults to 330
         * (Asia/Kolkata / IST). Override it from .env when needed.
         */
        const effectiveDateRange =
            filters.fromDate
                ||
                filters.toDate
                ? {
                    fromDate:
                        filters.fromDate,

                    toDate:
                        filters.toDate,
                }
                : this.getDefaultTodayRange();


        const createdAt:
            Record<
                string,
                Date
            > = {};


        if (
            effectiveDateRange.fromDate
        ) {
            createdAt.$gte =
                effectiveDateRange.fromDate;
        }


        if (
            effectiveDateRange.toDate
        ) {
            createdAt.$lte =
                effectiveDateRange.toDate;
        }


        if (
            Object.keys(
                createdAt,
            ).length >
            0
        ) {
            query.createdAt =
                createdAt;
        }


        return query as
            QueryFilter<IOrderDocument>;
    }


    /**
     * ========================================================
     * OPERATIONAL VENDOR ORDER FILTER
     * ========================================================
     */
    private buildVendorOrderFilter(
        filters:
            IAdminOrderFilters,
    ): QueryFilter<IOrderVendorDocument> {
        const query:
            Record<
                string,
                any
            > = {};


        /**
         * CURRENT operational vendor.
         *
         * This is intentionally based on
         * OrderVendor.vendor rather than the
         * original parent item vendor.
         *
         * Therefore vendor reassignment /
         * redirection works correctly.
         */
        if (
            filters.vendorId
        ) {
            query.vendor =
                new Types.ObjectId(
                    filters.vendorId,
                );
        }


        if (
            filters.driverId
        ) {
            query.driver =
                new Types.ObjectId(
                    filters.driverId,
                );
        }


        if (
            filters.vendorOrderStatus
        ) {
            query.status = {
                $in:
                    this.splitValues(
                        filters.vendorOrderStatus,
                    ),
            };
        }


        if (
            filters.sellerStatus
        ) {
            query.sellerStatus = {
                $in:
                    this.splitValues(
                        filters.sellerStatus,
                    ),
            };
        }


        if (
            filters.deliveryStatus
        ) {
            query.deliveryStatus = {
                $in:
                    this.splitValues(
                        filters.deliveryStatus,
                    ),
            };
        }


        if (
            filters.vendorPaymentStatus
        ) {
            query.paymentStatus = {
                $in:
                    this.splitValues(
                        filters.vendorPaymentStatus,
                    ),
            };
        }


        if (
            filters.vendorOrderIsActive !==
            undefined
        ) {
            query.isActive =
                filters.vendorOrderIsActive;
        }


        /**
         * Driver assignment.
         */
        if (
            filters.hasDriver !==
            undefined
        ) {
            if (
                filters.hasDriver
            ) {
                query.driver = {
                    $ne:
                        null,
                };
            } else {
                /**
                 * Mongo:
                 *
                 * { driver: null }
                 *
                 * matches null and missing fields.
                 */
                query.driver =
                    null;
            }
        }


        if (
            filters.liveTracking !==
            undefined
        ) {
            query.isLiveTrackingEnabled =
                filters.liveTracking;
        }


        return query as
            QueryFilter<IOrderVendorDocument>;
    }


    /**
     * ========================================================
     * PARENT SEARCH
     * ========================================================
     */
    private buildParentSearchConditions(
        safeSearch:
            string,
    ): QueryFilter<IOrderDocument>[] {
        return [
            {
                orderNumber: {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "shippingAddress.name": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "shippingAddress.phone": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "shippingAddress.city": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "shippingAddress.state": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "shippingAddress.pincode": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "billingAddress.name": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "billingAddress.phone": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "items.name": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "items.sku": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },
        ] as QueryFilter<IOrderDocument>[];
    }


    /**
     * ========================================================
     * VENDOR ORDER SEARCH
     * ========================================================
     */
    private buildVendorOrderSearchConditions(
        safeSearch:
            string,
    ): QueryFilter<IOrderVendorDocument>[] {
        return [
            {
                orderNumber: {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            /**
             * Very useful for admin.
             *
             * Allows direct search by individual
             * vendor fulfillment number.
             */
            {
                vendorOrderNumber: {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "shippingAddress.name": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "shippingAddress.phone": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "shippingAddress.city": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "shippingAddress.pincode": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "items.name": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },

            {
                "items.sku": {
                    $regex:
                        safeSearch,

                    $options:
                        "i",
                },
            },
        ] as QueryFilter<IOrderVendorDocument>[];
    }


    /**
     * ========================================================
     * FINANCIAL SUMMARY
     * ========================================================
     *
     * IMPORTANT:
     *
     * Only OrderModel participates in financial
     * aggregation.
     *
     * Example:
     *
     * Order = ₹1000
     *
     * Vendor A = ₹400
     * Vendor B = ₹600
     *
     * Revenue is still ₹1000,
     * NOT another independent customer revenue
     * calculation from vendor orders.
     */
    private async getFinancialSummary(
        filter:
            QueryFilter<IOrderDocument>,
    ): Promise<IAdminOrderFinancialSummary> {
        const result =
            await OrderModel.aggregate([
                {
                    $match:
                        filter,
                },

                {
                    $facet: {
                        totals: [
                            {
                                $group: {
                                    _id:
                                        null,


                                    totalOrders: {
                                        $sum:
                                            1,
                                    },


                                    grossOrderValue: {
                                        $sum:
                                            "$totalAmount",
                                    },


                                    successfulPaymentValue: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$paymentStatus",
                                                        "success",
                                                    ],
                                                },

                                                "$totalAmount",

                                                0,
                                            ],
                                        },
                                    },


                                    pendingPaymentValue: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$paymentStatus",
                                                        "pending",
                                                    ],
                                                },

                                                "$totalAmount",

                                                0,
                                            ],
                                        },
                                    },


                                    failedPaymentValue: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$paymentStatus",
                                                        "failed",
                                                    ],
                                                },

                                                "$totalAmount",

                                                0,
                                            ],
                                        },
                                    },


                                    refundedValue: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$paymentStatus",
                                                        "refunded",
                                                    ],
                                                },

                                                "$totalAmount",

                                                0,
                                            ],
                                        },
                                    },


                                    averageOrderValue: {
                                        $avg:
                                            "$totalAmount",
                                    },
                                },
                            },
                        ],


                        orderStatuses: [
                            {
                                $group: {
                                    _id:
                                        "$status",

                                    count: {
                                        $sum:
                                            1,
                                    },
                                },
                            },
                        ],


                        paymentStatuses: [
                            {
                                $group: {
                                    _id:
                                        "$paymentStatus",

                                    count: {
                                        $sum:
                                            1,
                                    },
                                },
                            },
                        ],


                        paymentModes: [
                            {
                                $group: {
                                    _id:
                                        "$paymentMode",

                                    count: {
                                        $sum:
                                            1,
                                    },
                                },
                            },
                        ],


                        orderTypes: [
                            {
                                $group: {
                                    _id:
                                        "$orderType",

                                    count: {
                                        $sum:
                                            1,
                                    },
                                },
                            },
                        ],
                    },
                },
            ]);


        const data =
            result[0]
            || {};


        const totals =
            data
                .totals
            ?.[0]
            || {};


        return {
            totalOrders:
                Number(
                    totals.totalOrders
                    || 0,
                ),


            grossOrderValue:
                Number(
                    totals.grossOrderValue
                    || 0,
                ),


            successfulPaymentValue:
                Number(
                    totals.successfulPaymentValue
                    || 0,
                ),


            pendingPaymentValue:
                Number(
                    totals.pendingPaymentValue
                    || 0,
                ),


            failedPaymentValue:
                Number(
                    totals.failedPaymentValue
                    || 0,
                ),


            refundedValue:
                Number(
                    totals.refundedValue
                    || 0,
                ),


            averageOrderValue:
                Number(
                    Number(
                        totals.averageOrderValue
                        || 0,
                    ).toFixed(
                        2,
                    ),
                ),


            orderStatusCounts:
                this.arrayToCountMap(
                    data.orderStatuses,
                ),


            paymentStatusCounts:
                this.arrayToCountMap(
                    data.paymentStatuses,
                ),


            paymentModeCounts:
                this.arrayToCountMap(
                    data.paymentModes,
                ),


            orderTypeCounts:
                this.arrayToCountMap(
                    data.orderTypes,
                ),
        };
    }


    /**
     * ========================================================
     * FULFILLMENT SUMMARY
     * ========================================================
     *
     * Admin can immediately understand the
     * operational situation without inspecting
     * every child record.
     */
    private buildFulfillmentSummary(
        parentOrder:
            any,

        vendorOrders:
            any[],
    ): IAdminOrderFulfillmentSummary {
        /**
         * Historical/reassigned vendor orders may
         * remain inactive.
         *
         * Current progress therefore uses only
         * active fulfillment records.
         */
        const activeVendorOrders =
            vendorOrders.filter(
                vendorOrder =>
                    vendorOrder
                        ?.isActive !==
                    false,
            );


        const inactiveVendorOrders =
            vendorOrders.filter(
                vendorOrder =>
                    vendorOrder
                        ?.isActive ===
                    false,
            );


        const expectedVendorOrderCount =
            Number(
                parentOrder
                    ?.vendorOrderCount
                || 0,
            );


        const deliveredCount =
            activeVendorOrders.filter(
                vendorOrder =>
                    vendorOrder
                        ?.deliveryStatus ===
                    "delivered"
                    ||
                    vendorOrder
                        ?.status ===
                    "delivered",
            ).length;


        const cancelledCount =
            activeVendorOrders.filter(
                vendorOrder =>
                    vendorOrder
                        ?.status ===
                    "cancelled"
                    ||
                    vendorOrder
                        ?.sellerStatus ===
                    "cancelled",
            ).length;


        const failedDeliveryCount =
            activeVendorOrders.filter(
                vendorOrder =>
                    vendorOrder
                        ?.deliveryStatus ===
                    "failed",
            ).length;


        const outForDeliveryCount =
            activeVendorOrders.filter(
                vendorOrder =>
                    vendorOrder
                        ?.deliveryStatus ===
                    "out_for_delivery",
            ).length;


        const assignedDriverCount =
            activeVendorOrders.filter(
                vendorOrder =>
                    Boolean(
                        vendorOrder
                            ?.driver,
                    ),
            ).length;


        const unassignedDriverCount =
            activeVendorOrders.filter(
                vendorOrder =>
                    !vendorOrder
                        ?.driver,
            ).length;


        const activeCount =
            activeVendorOrders.length;


        const completionPercentage =
            activeCount > 0
                ? Math.round(
                    (
                        deliveredCount /
                        activeCount
                    )
                    * 100,
                )
                : 0;


        const allDelivered =
            activeCount > 0
            &&
            deliveredCount ===
            activeCount;


        const partiallyDelivered =
            deliveredCount > 0
            &&
            deliveredCount <
            activeCount;


        /**
         * Compare original expected fulfillment
         * count against CURRENT active child
         * records.
         *
         * Historical reassigned/inactive children
         * do not falsely create a mismatch.
         */
        const vendorOrderCountMismatch =
            expectedVendorOrderCount >
            0
            &&
            expectedVendorOrderCount !==
            activeCount;


        return {
            expectedVendorOrderCount,


            /**
             * Includes active + historical.
             */
            actualVendorOrderCount:
                vendorOrders.length,


            activeVendorOrderCount:
                activeCount,


            inactiveVendorOrderCount:
                inactiveVendorOrders.length,


            vendorOrderCountMismatch,


            assignedDriverCount,


            unassignedDriverCount,


            outForDeliveryCount,


            deliveredCount,


            cancelledCount,


            failedDeliveryCount,


            completionPercentage,


            allDelivered,


            partiallyDelivered,


            hasOperationalIssue:
                vendorOrderCountMismatch
                ||
                failedDeliveryCount >
                0,


            statusCounts:
                this.buildDocumentCountMap(
                    activeVendorOrders,
                    "status",
                ),


            sellerStatusCounts:
                this.buildDocumentCountMap(
                    activeVendorOrders,
                    "sellerStatus",
                ),


            deliveryStatusCounts:
                this.buildDocumentCountMap(
                    activeVendorOrders,
                    "deliveryStatus",
                ),
        };
    }


    /**
     * ========================================================
     * GROUP VENDOR ORDERS BY PARENT
     * ========================================================
     */
    private groupVendorOrdersByParent(
        vendorOrders:
            any[],
    ): Map<
        string,
        any[]
    > {
        const map =
            new Map<
                string,
                any[]
            >();


        for (
            const vendorOrder of
            vendorOrders
        ) {
            const parentId =
                vendorOrder
                    ?.parentOrder
                    ?.toString?.();


            if (
                !parentId
            ) {
                continue;
            }


            const existing =
                map.get(
                    parentId,
                )
                || [];


            existing.push(
                vendorOrder,
            );


            map.set(
                parentId,
                existing,
            );
        }


        return map;
    }


    /**
     * ========================================================
     * TOTAL ITEM QUANTITY
     * ========================================================
     */
    private calculateTotalItems(
        items:
            any,
    ): number {
        if (
            !Array.isArray(
                items,
            )
        ) {
            return 0;
        }


        return items.reduce(
            (
                total:
                    number,

                item:
                    any,
            ) => {
                return total +
                    Number(
                        item
                            ?.quantity
                        || 0,
                    );
            },

            0,
        );
    }


    /**
     * ========================================================
     * COMMA-SEPARATED FILTER
     * ========================================================
     *
     * Example:
     *
     * delivered,cancelled,returned
     */
    /**
     * ========================================================
     * DEFAULT ADMIN ORDER DATE RANGE
     * ========================================================
     *
     * Admin order listing is date-wise by default.
     *
     * No fromDate/toDate:
     *      -> today's orders
     *
     * Explicit fromDate/toDate:
     *      -> requested date range
     *
     * The default timezone is IST (+05:30 / 330 minutes).
     */
    private getDefaultTodayRange(): {
        fromDate:
        Date;

        toDate:
        Date;
    } {
        const configuredOffset =
            Number(
                process.env
                    .ADMIN_ORDER_TIMEZONE_OFFSET_MINUTES
                ?? 330,
            );


        const timezoneOffsetMinutes =
            Number.isFinite(
                configuredOffset,
            )
                ? configuredOffset
                : 330;


        const offsetMilliseconds =
            timezoneOffsetMinutes
            * 60
            * 1000;


        const now =
            new Date();


        /**
         * Shift the current instant into the configured
         * business timezone and read its UTC calendar fields.
         */
        const businessNow =
            new Date(
                now.getTime()
                +
                offsetMilliseconds,
            );


        const year =
            businessNow
                .getUTCFullYear();

        const month =
            businessNow
                .getUTCMonth();

        const day =
            businessNow
                .getUTCDate();


        /**
         * Convert the configured timezone's local
         * start/end of day back into real UTC instants.
         */
        const fromDate =
            new Date(
                Date.UTC(
                    year,
                    month,
                    day,
                    0,
                    0,
                    0,
                    0,
                )
                -
                offsetMilliseconds,
            );


        const toDate =
            new Date(
                Date.UTC(
                    year,
                    month,
                    day,
                    23,
                    59,
                    59,
                    999,
                )
                -
                offsetMilliseconds,
            );


        return {
            fromDate,
            toDate,
        };
    }


    private splitValues(
        value:
            string,
    ): string[] {
        return value
            .split(
                ",",
            )

            .map(
                item =>
                    item
                        .trim()
                        .toLowerCase(),
            )

            .filter(
                Boolean,
            );
    }


    /**
     * ========================================================
     * HAS QUERY CONDITIONS
     * ========================================================
     */
    private hasConditions(
        value:
            object,
    ): boolean {
        return Object.keys(
            value,
        ).length > 0;
    }


    /**
     * ========================================================
     * SAFE REGEX
     * ========================================================
     */
    private escapeRegex(
        value:
            string,
    ): string {
        return value.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        );
    }


    /**
     * ========================================================
     * AGGREGATION COUNTS -> OBJECT
     * ========================================================
     *
     * [
     *   { _id: "success", count: 5 },
     *   { _id: "pending", count: 2 }
     * ]
     *
     * becomes
     *
     * {
     *   success: 5,
     *   pending: 2
     * }
     */
    private arrayToCountMap(
        values:
            any,
    ): Record<
        string,
        number
    > {
        const result:
            Record<
                string,
                number
            > = {};


        if (
            !Array.isArray(
                values,
            )
        ) {
            return result;
        }


        for (
            const item of
            values
        ) {
            if (
                !item
                    ?._id
            ) {
                continue;
            }


            result[
                item
                    ._id
                    .toString()
            ] =
                Number(
                    item.count
                    || 0,
                );
        }


        return result;
    }


    /**
     * ========================================================
     * DOCUMENT FIELD COUNTS
     * ========================================================
     */
    private buildDocumentCountMap(
        documents:
            any[],

        field:
            string,
    ): Record<
        string,
        number
    > {
        const result:
            Record<
                string,
                number
            > = {};


        for (
            const document of
            documents
        ) {
            const value =
                document
                    ?.[field]
                    ?.toString?.();


            if (
                !value
            ) {
                continue;
            }


            result[value] =
                (
                    result[value]
                    || 0
                )
                + 1;
        }


        return result;
    }
}