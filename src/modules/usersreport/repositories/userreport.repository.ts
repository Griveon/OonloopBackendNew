import type {
    PipelineStage,
} from "mongoose";

import {
    UserModel,
} from "../../user/models/user.model.js";

type UserStatus =
    | "active"
    | "inactive"
    | "suspended";

type UserRole =
    | "admin"
    | "user"
    | "vendor"
    | "driver";

type UserGender =
    | "male"
    | "female"
    | "other";

/**
 * Local Mongo filter type.
 *
 * This avoids FilterQuery compatibility issues between
 * different Mongoose versions and type definitions.
 */
type UserReportMongoFilter = {
    [key: string]: any;

    $or?: UserReportMongoFilter[];
    $and?: UserReportMongoFilter[];

    firstName?: any;
    lastName?: any;
    email?: any;
    mobileNumber?: any;

    role?: UserRole;
    roles?: UserRole;

    status?: UserStatus;
    gender?: UserGender;

    isEmailVerified?: boolean;

    createdAt?: {
        $gte?: Date;
        $lte?: Date;
    };
};

export interface IUserReportFilters {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    gender?: UserGender;
    isEmailVerified?: boolean;
    fromDate?: Date;
    toDate?: Date;
}

export interface IUserReportPagination {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 1 | -1;
}

export class UserReportRepository {

    private buildFilter(
        filters: IUserReportFilters
    ): UserReportMongoFilter {
        const query: UserReportMongoFilter = {};

        if (filters.search) {
            const search =
                filters.search.trim();

            if (search) {
                query.$or = [
                    {
                        firstName: {
                            $regex: search,
                            $options: "i",
                        },
                    },
                    {
                        lastName: {
                            $regex: search,
                            $options: "i",
                        },
                    },
                    {
                        email: {
                            $regex: search,
                            $options: "i",
                        },
                    },
                    {
                        mobileNumber: {
                            $regex: search,
                            $options: "i",
                        },
                    },
                ];
            }
        }

        if (filters.role) {
            const roleFilter:
                UserReportMongoFilter = {
                $or: [
                    {
                        role: filters.role,
                    },
                    {
                        roles: filters.role,
                    },
                ],
            };

            query.$and = [
                ...(query.$and ?? []),
                roleFilter,
            ];
        }

        if (filters.status) {
            query.status =
                filters.status;
        }

        if (filters.gender) {
            query.gender =
                filters.gender;
        }

        if (
            typeof filters.isEmailVerified ===
            "boolean"
        ) {
            query.isEmailVerified =
                filters.isEmailVerified;
        }

        if (
            filters.fromDate ||
            filters.toDate
        ) {
            query.createdAt = {};

            if (filters.fromDate) {
                query.createdAt.$gte =
                    filters.fromDate;
            }

            if (filters.toDate) {
                query.createdAt.$lte =
                    filters.toDate;
            }
        }

        return query;
    }

    async findUsers(
        filters: IUserReportFilters,
        pagination: IUserReportPagination
    ) {
        const query =
            this.buildFilter(filters);

        const page = Math.max(
            pagination.page,
            1
        );

        const limit = Math.min(
            Math.max(
                pagination.limit,
                1
            ),
            100
        );

        const skip =
            (page - 1) * limit;

        const allowedSortFields = [
            "createdAt",
            "updatedAt",
            "firstName",
            "lastName",
            "email",
            "status",
            "lastLogin",
        ];

        const sortBy =
            pagination.sortBy &&
                allowedSortFields.includes(
                    pagination.sortBy
                )
                ? pagination.sortBy
                : "createdAt";

        const sortOrder =
            pagination.sortOrder === 1
                ? 1
                : -1;

        const [users, total] =
            await Promise.all([
                UserModel.find(query)
                    .select(
                        [
                            "_id",
                            "firstName",
                            "lastName",
                            "email",
                            "mobileNumber",
                            "dateOfBirth",
                            "gender",
                            "status",
                            "isEmailVerified",
                            "role",
                            "roles",
                            "lastLogin",
                            "createdAt",
                            "updatedAt",
                        ].join(" ")
                    )
                    .sort({
                        [sortBy]: sortOrder,
                    })
                    .skip(skip)
                    .limit(limit)
                    .lean(),

                UserModel.countDocuments(
                    query
                ),
            ]);

        return {
            users,
            total,
            page,
            limit,
        };
    }

    async findUsersForExport(
        filters: IUserReportFilters
    ) {
        const query =
            this.buildFilter(filters);

        return UserModel.find(query)
            .select(
                [
                    "_id",
                    "firstName",
                    "lastName",
                    "email",
                    "mobileNumber",
                    "dateOfBirth",
                    "gender",
                    "status",
                    "isEmailVerified",
                    "role",
                    "roles",
                    "lastLogin",
                    "createdAt",
                    "updatedAt",
                ].join(" ")
            )
            .sort({
                createdAt: -1,
            })
            .lean();
    }

    async getSummary() {
        const elevenMonthsAgo =
            new Date();

        elevenMonthsAgo.setMonth(
            elevenMonthsAgo.getMonth() -
            11
        );

        elevenMonthsAgo.setHours(
            0,
            0,
            0,
            0
        );

        const pipeline:
            PipelineStage[] = [
                {
                    $facet: {
                        totals: [
                            {
                                $group: {
                                    _id: null,

                                    totalUsers: {
                                        $sum: 1,
                                    },

                                    verifiedUsers: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$isEmailVerified",
                                                        true,
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    },

                                    activeUsers: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$status",
                                                        "active",
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    },

                                    inactiveUsers: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$status",
                                                        "inactive",
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    },

                                    suspendedUsers: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$status",
                                                        "suspended",
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    },
                                },
                            },
                        ],

                        roles: [
                            {
                                $project: {
                                    effectiveRoles: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $isArray:
                                                            "$roles",
                                                    },
                                                    {
                                                        $gt: [
                                                            {
                                                                $size:
                                                                    "$roles",
                                                            },
                                                            0,
                                                        ],
                                                    },
                                                ],
                                            },
                                            "$roles",
                                            ["$role"],
                                        ],
                                    },
                                },
                            },
                            {
                                $unwind:
                                    "$effectiveRoles",
                            },
                            {
                                $group: {
                                    _id: "$effectiveRoles",
                                    count: {
                                        $sum: 1,
                                    },
                                },
                            },
                        ],

                        registrationsByMonth: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte:
                                            elevenMonthsAgo,
                                    },
                                },
                            },
                            {
                                $group: {
                                    _id: {
                                        year: {
                                            $year:
                                                "$createdAt",
                                        },
                                        month: {
                                            $month:
                                                "$createdAt",
                                        },
                                    },
                                    count: {
                                        $sum: 1,
                                    },
                                },
                            },
                            {
                                $sort: {
                                    "_id.year": 1,
                                    "_id.month": 1,
                                },
                            },
                        ],
                    },
                },
            ];

        const [result] =
            await UserModel.aggregate(
                pipeline
            );

        return (
            result ?? {
                totals: [],
                roles: [],
                registrationsByMonth: [],
            }
        );
    }

    async findRecentUsers(
        limit = 5
    ) {
        const safeLimit = Math.min(
            Math.max(limit, 1),
            20
        );

        return UserModel.find()
            .select(
                [
                    "_id",
                    "firstName",
                    "lastName",
                    "email",
                    "mobileNumber",
                    "status",
                    "role",
                    "roles",
                    "isEmailVerified",
                    "createdAt",
                ].join(" ")
            )
            .sort({
                createdAt: -1,
            })
            .limit(safeLimit)
            .lean();
    }
}