export type AdminOrderSortOrder =
    | "asc"
    | "desc";

export type AdminOrderSortBy =
    | "createdAt"
    | "updatedAt"
    | "totalAmount"
    | "subtotal"
    | "orderNumber"
    | "status"
    | "paymentStatus";

export interface IAdminOrderFilters {
    search?: string;

    status?: string;
    paymentStatus?: string;
    paymentMode?: string;
    orderType?: string;
    userId?: string;
    paymentMethodId?: string;
    paymentTransactionId?: string;
    isActive?: boolean;

    vendorId?: string;
    driverId?: string;
    vendorOrderStatus?: string;
    sellerStatus?: string;
    deliveryStatus?: string;
    vendorPaymentStatus?: string;
    vendorOrderIsActive?: boolean;
    hasDriver?: boolean;
    liveTracking?: boolean;

    minAmount?: number;
    maxAmount?: number;

    fromDate?: Date;
    toDate?: Date;

    page: number;
    limit: number;

    sortBy: AdminOrderSortBy;
    sortOrder: AdminOrderSortOrder;
}

export interface IAdminOrderFinancialSummary {
    totalOrders: number;
    grossOrderValue: number;
    successfulPaymentValue: number;
    pendingPaymentValue: number;
    failedPaymentValue: number;
    refundedValue: number;
    averageOrderValue: number;

    orderStatusCounts: Record<string, number>;
    paymentStatusCounts: Record<string, number>;
    paymentModeCounts: Record<string, number>;
    orderTypeCounts: Record<string, number>;
}

export interface IAdminOrderFulfillmentSummary {
    expectedVendorOrderCount: number;
    actualVendorOrderCount: number;
    activeVendorOrderCount: number;
    inactiveVendorOrderCount: number;

    vendorOrderCountMismatch: boolean;

    assignedDriverCount: number;
    unassignedDriverCount: number;
    outForDeliveryCount: number;
    deliveredCount: number;
    cancelledCount: number;
    failedDeliveryCount: number;

    completionPercentage: number;

    allDelivered: boolean;
    partiallyDelivered: boolean;
    hasOperationalIssue: boolean;

    statusCounts: Record<string, number>;
    sellerStatusCounts: Record<string, number>;
    deliveryStatusCounts: Record<string, number>;
}

export interface IAdminOrderPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface IAdminOrdersResult {
    orders: any[];
    pagination: IAdminOrderPagination;
    summary: IAdminOrderFinancialSummary;
}