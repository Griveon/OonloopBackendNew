export type UserReportRole =
    | "admin"
    | "user"
    | "vendor"
    | "driver";

export type UserReportStatus =
    | "active"
    | "inactive"
    | "suspended";

export type UserReportGender =
    | "male"
    | "female"
    | "other";

export type UserReportSortBy =
    | "createdAt"
    | "updatedAt"
    | "lastLogin"
    | "firstName"
    | "email";

export type SortOrder =
    | "asc"
    | "desc";

export interface IUserReportFilters {
    page?: number;
    limit?: number;

    search?: string;

    role?: UserReportRole;
    status?: UserReportStatus;
    gender?: UserReportGender;

    isEmailVerified?: boolean;

    fromDate?: Date;
    toDate?: Date;

    sortBy?: UserReportSortBy;
    sortOrder?: SortOrder;
}

export interface IUserReportItem {
    _id: string;

    firstName: string;
    lastName: string;
    fullName: string;

    email: string;
    mobileNumber: string | null;

    dateOfBirth: Date | null;
    gender: UserReportGender | null;

    role: UserReportRole;
    roles: UserReportRole[];

    status: UserReportStatus;
    isEmailVerified: boolean;

    lastLogin: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

export interface IUserReportPagination {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface IUserReportListResult {
    users: IUserReportItem[];
    pagination: IUserReportPagination;
}

export interface IUserReportSummary {
    totalUsers: number;

    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;

    verifiedUsers: number;
    unverifiedUsers: number;

    loggedInUsers: number;
    neverLoggedInUsers: number;

    newUsersToday: number;
    newUsersThisMonth: number;

    roleCounts: {
        admin: number;
        user: number;
        vendor: number;
        driver: number;
    };

    genderCounts: {
        male: number;
        female: number;
        other: number;
        unspecified: number;
    };
}