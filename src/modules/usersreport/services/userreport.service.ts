import type { IUserReportFilters } from "../interfaces/userreport.interface.js";
import {
    UserReportRepository,
} from "../repositories/userreport.repository.js";

type UserRole =
    | "admin"
    | "user"
    | "vendor"
    | "driver";

type UserStatus =
    | "active"
    | "inactive"
    | "suspended";

type UserGender =
    | "male"
    | "female"
    | "other";

export interface IUserReportQuery {
    page?: string | number;
    limit?: string | number;
    search?: string;
    role?: string;
    status?: string;
    gender?: string;
    isEmailVerified?: string | boolean;
    fromDate?: string;
    toDate?: string;
    sortBy?: string;
    sortOrder?: string;
}

export class UserReportService {

    private userReportRepository:
        UserReportRepository;

    constructor() {
        this.userReportRepository =
            new UserReportRepository();
    }

    private readonly allowedRoles:
        UserRole[] = [
            "admin",
            "user",
            "vendor",
            "driver",
        ];

    private readonly allowedStatuses:
        UserStatus[] = [
            "active",
            "inactive",
            "suspended",
        ];

    private readonly allowedGenders:
        UserGender[] = [
            "male",
            "female",
            "other",
        ];

    private parseBoolean(
        value?: string | boolean
    ): boolean | undefined {
        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return undefined;
        }

        if (
            value === true ||
            value === "true"
        ) {
            return true;
        }

        if (
            value === false ||
            value === "false"
        ) {
            return false;
        }

        throw new Error(
            "isEmailVerified must be true or false"
        );
    }

    private parseDate(
        value: string | undefined,
        fieldName: string,
        endOfDay = false
    ): Date | undefined {
        if (!value) {
            return undefined;
        }

        const date = new Date(value);

        if (
            Number.isNaN(date.getTime())
        ) {
            throw new Error(
                `Invalid ${fieldName}`
            );
        }

        if (endOfDay) {
            date.setHours(
                23,
                59,
                59,
                999
            );
        } else {
            date.setHours(
                0,
                0,
                0,
                0
            );
        }

        return date;
    }

    private buildFilters(
        query: IUserReportQuery
    ): IUserReportFilters {
        const filters:
            any = {};

        if (query.search) {
            filters.search =
                query.search
                    .toString()
                    .trim();
        }

        if (query.role) {
            const role =
                query.role
                    .toString()
                    .trim()
                    .toLowerCase() as UserRole;

            if (
                !this.allowedRoles.includes(
                    role
                )
            ) {
                throw new Error(
                    "Invalid role filter"
                );
            }

            filters.role = role;
        }

        if (query.status) {
            const status =
                query.status
                    .toString()
                    .trim()
                    .toLowerCase() as UserStatus;

            if (
                !this.allowedStatuses.includes(
                    status
                )
            ) {
                throw new Error(
                    "Invalid status filter"
                );
            }

            filters.status = status;
        }

        if (query.gender) {
            const gender =
                query.gender
                    .toString()
                    .trim()
                    .toLowerCase() as UserGender;

            if (
                !this.allowedGenders.includes(
                    gender
                )
            ) {
                throw new Error(
                    "Invalid gender filter"
                );
            }

            filters.gender = gender;
        }

        filters.isEmailVerified =
            this.parseBoolean(
                query.isEmailVerified
            );

        filters.fromDate =
            this.parseDate(
                query.fromDate,
                "fromDate"
            );

        filters.toDate =
            this.parseDate(
                query.toDate,
                "toDate",
                true
            );

        if (
            filters.fromDate &&
            filters.toDate &&
            filters.fromDate >
            filters.toDate
        ) {
            throw new Error(
                "fromDate cannot be greater than toDate"
            );
        }

        return filters;
    }

    async getUsersReport(
        query: IUserReportQuery
    ) {
        const page = Math.max(
            Number(query.page) || 1,
            1
        );

        const limit = Math.min(
            Math.max(
                Number(query.limit) || 20,
                1
            ),
            100
        );

        const sortOrder =
            query.sortOrder
                ?.toString()
                .toLowerCase() === "asc"
                ? 1
                : -1;

        const filters =
            this.buildFilters(query);

        const result =
            await this.userReportRepository.findUsers(
                filters,
                {
                    page,
                    limit,
                    sortBy:
                        query.sortBy
                            ?.toString()
                            .trim() ||
                        "createdAt",
                    sortOrder,
                }
            );

        const totalPages =
            Math.ceil(
                result.total /
                result.limit
            );

        return {
            users: result.users.map(
                (user: any) =>
                    this.formatUser(user)
            ),

            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages,
                hasNextPage:
                    result.page <
                    totalPages,
                hasPreviousPage:
                    result.page > 1,
            },
        };
    }

    async getUsersSummary() {
        const [
            summary,
            recentUsers,
        ] = await Promise.all([
            this.userReportRepository.getSummary(),
            this.userReportRepository.findRecentUsers(
                5
            ),
        ]);

        const totals =
            summary?.totals?.[0] || {
                totalUsers: 0,
                verifiedUsers: 0,
                activeUsers: 0,
                inactiveUsers: 0,
                suspendedUsers: 0,
            };

        const roleCounts: Record<
            UserRole,
            number
        > = {
            admin: 0,
            user: 0,
            vendor: 0,
            driver: 0,
        };

        for (
            const roleItem of
            summary?.roles || []
        ) {
            const role =
                roleItem._id as UserRole;

            if (
                this.allowedRoles.includes(
                    role
                )
            ) {
                roleCounts[role] =
                    roleItem.count;
            }
        }

        const registrationsByMonth =
            (
                summary?.registrationsByMonth ||
                []
            ).map(
                (item: any) => ({
                    year:
                        item._id.year,
                    month:
                        item._id.month,
                    count:
                        item.count,
                })
            );

        return {
            totals: {
                totalUsers:
                    totals.totalUsers ||
                    0,

                activeUsers:
                    totals.activeUsers ||
                    0,

                inactiveUsers:
                    totals.inactiveUsers ||
                    0,

                suspendedUsers:
                    totals.suspendedUsers ||
                    0,

                verifiedUsers:
                    totals.verifiedUsers ||
                    0,

                unverifiedUsers:
                    Math.max(
                        (totals.totalUsers ||
                            0) -
                        (totals.verifiedUsers ||
                            0),
                        0
                    ),
            },

            roleCounts,

            registrationsByMonth,

            recentUsers:
                recentUsers.map(
                    (user: any) =>
                        this.formatUser(
                            user
                        )
                ),
        };
    }

    async exportUsersCsv(
        query: IUserReportQuery
    ) {
        const filters =
            this.buildFilters(query);

        const users =
            await this.userReportRepository.findUsersForExport(
                filters
            );

        const headers = [
            "User ID",
            "First Name",
            "Last Name",
            "Full Name",
            "Email",
            "Mobile Number",
            "Date Of Birth",
            "Gender",
            "Primary Role",
            "All Roles",
            "Status",
            "Email Verified",
            "Last Login",
            "Registered At",
            "Updated At",
        ];

        const rows = users.map(
            (user: any) => {
                const roles =
                    this.getUserRoles(
                        user
                    );

                return [
                    user._id?.toString() ||
                    "",

                    user.firstName || "",

                    user.lastName || "",

                    [
                        user.firstName,
                        user.lastName,
                    ]
                        .filter(Boolean)
                        .join(" "),

                    user.email || "",

                    user.mobileNumber ||
                    "",

                    this.formatDate(
                        user.dateOfBirth
                    ),

                    user.gender || "",

                    user.role ||
                    roles[0] ||
                    "user",

                    roles.join(", "),

                    user.status ||
                    "active",

                    user.isEmailVerified
                        ? "Yes"
                        : "No",

                    this.formatDate(
                        user.lastLogin
                    ),

                    this.formatDate(
                        user.createdAt
                    ),

                    this.formatDate(
                        user.updatedAt
                    ),
                ];
            }
        );

        return this.convertToCsv(
            headers,
            rows
        );
    }

    private getUserRoles(
        user: any
    ): UserRole[] {
        const sourceRoles: unknown[] =
            Array.isArray(user?.roles) &&
                user.roles.length > 0
                ? user.roles
                : [user?.role];

        const normalizedRoles:
            UserRole[] = sourceRoles
                .map((role: unknown) =>
                    String(role ?? "")
                        .trim()
                        .toLowerCase()
                )
                .filter(
                    (
                        role: string
                    ): role is UserRole =>
                        this.allowedRoles.includes(
                            role as UserRole
                        )
                );

        return Array.from(
            new Set<UserRole>(
                normalizedRoles
            )
        );
    }
    
    private formatUser(
        user: any
    ) {
        const roles =
            this.getUserRoles(user);

        return {
            _id:
                user._id?.toString(),

            firstName:
                user.firstName || "",

            lastName:
                user.lastName || "",

            fullName: [
                user.firstName,
                user.lastName,
            ]
                .filter(Boolean)
                .join(" "),

            email:
                user.email || "",

            mobileNumber:
                user.mobileNumber ||
                null,

            dateOfBirth:
                user.dateOfBirth ||
                null,

            gender:
                user.gender || null,

            status:
                user.status ||
                "active",

            isEmailVerified:
                Boolean(
                    user.isEmailVerified
                ),

            role:
                user.role ||
                roles[0] ||
                "user",

            roles,

            lastLogin:
                user.lastLogin ||
                null,

            createdAt:
                user.createdAt,

            updatedAt:
                user.updatedAt,
        };
    }

    private formatDate(
        value?: Date | string | null
    ): string {
        if (!value) {
            return "";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(date.getTime())
        ) {
            return "";
        }

        return date.toISOString();
    }

    private escapeCsvValue(
        value: unknown
    ): string {
        const text =
            value === null ||
                value === undefined
                ? ""
                : String(value);

        return `"${text.replace(
            /"/g,
            '""'
        )}"`;
    }

    private convertToCsv(
        headers: string[],
        rows: unknown[][]
    ): string {
        const csvRows = [
            headers.map(
                (header) =>
                    this.escapeCsvValue(
                        header
                    )
            ),

            ...rows.map(
                (row) =>
                    row.map(
                        (value) =>
                            this.escapeCsvValue(
                                value
                            )
                    )
            ),
        ];

        /**
         * UTF-8 BOM ensures Excel displays
         * characters correctly.
         */
        return (
            "\uFEFF" +
            csvRows
                .map((row) =>
                    row.join(",")
                )
                .join("\r\n")
        );
    }
}