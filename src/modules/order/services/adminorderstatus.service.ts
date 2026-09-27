import { Types } from "mongoose";
import { AdminOrderStatusRepository } from "../repository/adminorderstatus.repository.js";

const PARENT_STATUSES = [
    "pending",
    "placed",
    "processing",
    "partially_ready",
    "ready_for_pickup",
    "partially_shipped",
    "shipped",
    "partially_delivered",
    "delivered",
    "partially_cancelled",
    "cancelled",
    "returned",
] as const;

const PAYMENT_STATUSES = ["pending", "success", "failed", "refunded"] as const;

const VENDOR_ORDER_STATUSES = [
    "pending",
    "placed",
    "seller_accepted",
    "picking_products",
    "packing_order",
    "ready_for_pickup",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
] as const;

const SELLER_STATUSES = [
    "pending_acceptance",
    "accepted",
    "picking_products",
    "packing_order",
    "ready_for_pickup",
    "handed_to_rider",
    "cancelled",
] as const;

const DELIVERY_STATUSES = [
    "not_assigned",
    "assigned",
    "delivery_accepted",
    "proceeding_to_store",
    "reached_store",
    "waiting_for_packing",
    "pickup_verification_pending",
    "pickup_verified",
    "picked_up",
    "out_for_delivery",
    "reached_customer",
    "customer_verification_pending",
    "delivered",
    "failed",
    "returned",
] as const;

const SELLER_STATUS_BY_VENDOR_STATUS: Record<string, string> = {
    pending: "pending_acceptance",
    placed: "pending_acceptance",
    seller_accepted: "accepted",
    picking_products: "picking_products",
    packing_order: "packing_order",
    ready_for_pickup: "ready_for_pickup",
    shipped: "handed_to_rider",
    delivered: "handed_to_rider",
    cancelled: "cancelled",
};

const VENDOR_STATUS_BY_SELLER_STATUS: Record<string, string> = {
    pending_acceptance: "placed",
    accepted: "seller_accepted",
    picking_products: "picking_products",
    packing_order: "packing_order",
    ready_for_pickup: "ready_for_pickup",
    handed_to_rider: "shipped",
    cancelled: "cancelled",
};

const VENDOR_STATUS_BY_DELIVERY_STATUS: Record<string, string | undefined> = {
    picked_up: "shipped",
    out_for_delivery: "shipped",
    reached_customer: "shipped",
    customer_verification_pending: "shipped",
    delivered: "delivered",
    returned: "returned",
};

const STATUS_TITLES: Record<string, string> = {
    pending: "Order pending",
    placed: "Order placed",
    processing: "Order processing",
    partially_ready: "Order partially ready",
    ready_for_pickup: "Order ready for pickup",
    partially_shipped: "Order partially shipped",
    shipped: "Order shipped",
    partially_delivered: "Order partially delivered",
    delivered: "Order delivered",
    partially_cancelled: "Order partially cancelled",
    cancelled: "Order cancelled",
    returned: "Order returned",
    seller_accepted: "Order accepted by seller",
    picking_products: "Seller started picking products",
    packing_order: "Seller started packing order",
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const generatePickupQrCode = (orderNumber: string, vendorOrderNumber: string) =>
    `PICKUP-${orderNumber}-${vendorOrderNumber}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

export interface AdminParentStatusUpdateInput {
    status?: string;
    paymentStatus?: string;
    remark?: string;
}

export interface AdminVendorStatusUpdateInput {
    status?: string;
    sellerStatus?: string;
    deliveryStatus?: string;
    paymentStatus?: string;
    remark?: string;
}

export class AdminOrderStatusService {
    private repo = new AdminOrderStatusRepository();

    getStatusOptions() {
        return {
            parentStatuses: [...PARENT_STATUSES],
            paymentStatuses: [...PAYMENT_STATUSES],
            vendorOrderStatuses: [...VENDOR_ORDER_STATUSES],
            sellerStatuses: [...SELLER_STATUSES],
            deliveryStatuses: [...DELIVERY_STATUSES],
        };
    }

    async updateParentOrderStatus(
        orderId: string,
        data: AdminParentStatusUpdateInput,
        adminUserId?: string
    ) {
        this.ensureObjectId(orderId, "orderId");

        const status = this.clean(data?.status);
        const paymentStatus = this.clean(data?.paymentStatus);
        const remark = this.clean(data?.remark);

        if (!status && !paymentStatus) {
            throw new Error("status or paymentStatus is required");
        }

        if (status) this.ensureAllowed(status, PARENT_STATUSES, "order status");
        if (paymentStatus) this.ensureAllowed(paymentStatus, PAYMENT_STATUSES, "payment status");

        const existing: any = await this.repo.findParentOrderById(orderId);
        if (!existing) throw new Error("Order not found");

        const now = new Date();
        const setData: Record<string, any> = {};

        if (status && status !== existing.status) {
            setData.status = status;
        }

        if (paymentStatus && paymentStatus !== existing.paymentStatus) {
            // Admin payment correction changes ONLY paymentStatus.
            // It does not modify the parent order lifecycle status.
            setData.paymentStatus = paymentStatus;
        }

        const effectiveStatus = setData.status || existing.status;

        if (effectiveStatus === "cancelled" && remark) {
            setData.cancellationReason = remark;
        }

        if (Object.keys(setData).length === 0) {
            return {
                success: true,
                alreadyUpToDate: true,
                order: await this.repo.getAdminOrderDetail(orderId),
            };
        }

        const updateData: any = {
            $set: setData,
            $push: {
                trackingHistory: {
                    title: status
                        ? STATUS_TITLES[effectiveStatus] || "Order status updated by admin"
                        : "Payment status updated by admin",
                    status: effectiveStatus,
                    remark:
                        remark ||
                        (status
                            ? `Admin changed parent order status from ${existing.status} to ${effectiveStatus}`
                            : `Admin changed payment status from ${existing.paymentStatus} to ${paymentStatus}`),
                    ...this.updatedBy(adminUserId),
                    updatedByRole: "admin",
                    updatedAt: now,
                },
            },
        };

        const updated = await this.repo.updateParentOrder(orderId, updateData);
        if (!updated) throw new Error("Order not found");

        return {
            success: true,
            alreadyUpToDate: false,
            order: await this.repo.getAdminOrderDetail(orderId),
        };
    }

    async updateVendorOrderStatus(
        vendorOrderId: string,
        data: AdminVendorStatusUpdateInput,
        adminUserId?: string
    ) {
        this.ensureObjectId(vendorOrderId, "vendorOrderId");

        const requestedStatus = this.clean(data?.status);
        const requestedSellerStatus = this.clean(data?.sellerStatus);
        const requestedDeliveryStatus = this.clean(data?.deliveryStatus);
        const requestedPaymentStatus = this.clean(data?.paymentStatus);
        const remark = this.clean(data?.remark);

        if (
            !requestedStatus &&
            !requestedSellerStatus &&
            !requestedDeliveryStatus &&
            !requestedPaymentStatus
        ) {
            throw new Error("status, sellerStatus, deliveryStatus or paymentStatus is required");
        }

        if (requestedStatus) {
            this.ensureAllowed(requestedStatus, VENDOR_ORDER_STATUSES, "vendor order status");
        }
        if (requestedSellerStatus) {
            this.ensureAllowed(requestedSellerStatus, SELLER_STATUSES, "seller status");
        }
        if (requestedDeliveryStatus) {
            this.ensureAllowed(requestedDeliveryStatus, DELIVERY_STATUSES, "delivery status");
        }
        if (requestedPaymentStatus) {
            this.ensureAllowed(requestedPaymentStatus, PAYMENT_STATUSES, "payment status");
        }

        const existing: any = await this.repo.findVendorOrderForUpdate(vendorOrderId);
        if (!existing) throw new Error("Vendor order not found");

        let effectiveVendorStatus = requestedStatus || undefined;

        if (!effectiveVendorStatus && requestedSellerStatus) {
            effectiveVendorStatus = VENDOR_STATUS_BY_SELLER_STATUS[requestedSellerStatus];
        }

        if (!effectiveVendorStatus && requestedDeliveryStatus) {
            effectiveVendorStatus = VENDOR_STATUS_BY_DELIVERY_STATUS[requestedDeliveryStatus];
        }

        if (
            requestedStatus &&
            requestedSellerStatus &&
            SELLER_STATUS_BY_VENDOR_STATUS[requestedStatus] &&
            SELLER_STATUS_BY_VENDOR_STATUS[requestedStatus] !== requestedSellerStatus
        ) {
            throw new Error(
                `sellerStatus ${requestedSellerStatus} is not compatible with vendor order status ${requestedStatus}`
            );
        }

        const now = new Date();
        const setData: Record<string, any> = {};

        if (effectiveVendorStatus && effectiveVendorStatus !== existing.status) {
            setData.status = effectiveVendorStatus;
        }

        if (requestedSellerStatus) {
            if (requestedSellerStatus !== existing.sellerStatus) {
                setData.sellerStatus = requestedSellerStatus;
            }
        } else if (effectiveVendorStatus && SELLER_STATUS_BY_VENDOR_STATUS[effectiveVendorStatus]) {
            const mappedSellerStatus = SELLER_STATUS_BY_VENDOR_STATUS[effectiveVendorStatus];
            if (mappedSellerStatus !== existing.sellerStatus) {
                setData.sellerStatus = mappedSellerStatus;
            }
        }

        if (requestedDeliveryStatus && requestedDeliveryStatus !== existing.deliveryStatus) {
            setData.deliveryStatus = requestedDeliveryStatus;
        }

        if (requestedPaymentStatus && requestedPaymentStatus !== existing.paymentStatus) {
            setData.paymentStatus = requestedPaymentStatus;

            if (
                !effectiveVendorStatus &&
                requestedPaymentStatus === "success" &&
                existing.status === "pending"
            ) {
                effectiveVendorStatus = "placed";
                setData.status = "placed";
                setData.sellerStatus = "pending_acceptance";
            }
        }

        this.applyVendorStatusTimestamps(
            setData,
            effectiveVendorStatus || setData.status,
            existing,
            now,
            remark
        );
        this.applyDeliveryStatusTimestamps(setData, requestedDeliveryStatus, now, remark);

        if (Object.keys(setData).length === 0) {
            return {
                success: true,
                alreadyUpToDate: true,
                vendorOrder: await this.repo.findVendorOrderById(vendorOrderId),
                parentOrder: await this.repo.getAdminOrderDetail(existing.parentOrder.toString()),
            };
        }

        const historyStatus = setData.status || existing.status;
        const updateData: any = {
            $set: setData,
            $push: {
                trackingHistory: {
                    title: STATUS_TITLES[historyStatus] || "Vendor order updated by admin",
                    status: historyStatus,
                    remark:
                        remark ||
                        this.buildVendorRemark(existing, {
                            status: setData.status,
                            sellerStatus: setData.sellerStatus,
                            deliveryStatus: setData.deliveryStatus,
                            paymentStatus: setData.paymentStatus,
                        }),
                    ...this.updatedBy(adminUserId),
                    updatedByRole: "admin",
                    updatedAt: now,
                },
            },
        };

        const updatedVendorOrder: any = await this.repo.updateVendorOrder(vendorOrderId, updateData);
        if (!updatedVendorOrder) throw new Error("Vendor order not found");

        // Preserve the same parent aggregation behavior already used by VendorOrderService.
        await this.syncParentOrderStatus(updatedVendorOrder.parentOrder.toString(), adminUserId);

        return {
            success: true,
            alreadyUpToDate: false,
            vendorOrder: await this.repo.findVendorOrderById(vendorOrderId),
            parentOrder: await this.repo.getAdminOrderDetail(updatedVendorOrder.parentOrder.toString()),
        };
    }

    private applyVendorStatusTimestamps(
        setData: Record<string, any>,
        status: string | undefined,
        existing: any,
        now: Date,
        remark?: string
    ) {
        if (!status) return;

        if (status === "seller_accepted") {
            setData.sellerAcceptedAt = now;
            if (!existing.sellerAcceptDeadlineAt) {
                const createdAt = existing.createdAt ? new Date(existing.createdAt).getTime() : Date.now();
                setData.sellerAcceptDeadlineAt = new Date(createdAt + 5 * 60 * 1000);
            }
        }

        if (status === "picking_products") setData.pickingStartedAt = now;
        if (status === "packing_order") setData.packingStartedAt = now;

        if (status === "ready_for_pickup") {
            setData.readyForPickupAt = now;

            if (!existing.pickupVerification?.pickupOtp) {
                setData["pickupVerification.pickupOtp"] = generateOtp();
            }
            if (!existing.pickupVerification?.pickupQrCode) {
                setData["pickupVerification.pickupQrCode"] = generatePickupQrCode(
                    existing.orderNumber,
                    existing.vendorOrderNumber
                );
            }

            setData["pickupVerification.otpVerified"] = false;
            setData["pickupVerification.qrVerified"] = false;

            if (
                existing.deliveryStatus &&
                !["not_assigned", "picked_up", "out_for_delivery", "delivered"].includes(existing.deliveryStatus)
            ) {
                setData.deliveryStatus = "pickup_verification_pending";
            }
        }

        if (status === "shipped") {
            setData.shippedAt = now;
            if (!existing.handedToRiderAt) setData.handedToRiderAt = now;
        }

        if (status === "delivered") {
            setData.deliveredAt = now;
        }

        if (status === "cancelled") {
            setData.cancelledAt = now;
            setData.cancellationReason = remark || existing.cancellationReason || "Cancelled by admin";
        }

        if (status === "returned") {
            setData.returnedAt = now;
        }
    }

    private applyDeliveryStatusTimestamps(
        setData: Record<string, any>,
        deliveryStatus: string | undefined,
        now: Date,
        remark?: string
    ) {
        if (!deliveryStatus) return;

        const timestampMap: Record<string, string> = {
            assigned: "driverAssignedAt",
            delivery_accepted: "deliveryAcceptedAt",
            proceeding_to_store: "proceedingToStoreAt",
            reached_store: "reachedStoreAt",
            waiting_for_packing: "waitingForPackingAt",
            picked_up: "pickedUpAt",
            out_for_delivery: "outForDeliveryAt",
            reached_customer: "reachedCustomerAt",
            delivered: "deliveredAt",
            returned: "returnedAt",
        };

        const timestampField = timestampMap[deliveryStatus];
        if (timestampField) setData[timestampField] = now;

        if (["picked_up", "out_for_delivery", "reached_customer", "customer_verification_pending"].includes(deliveryStatus)) {
            setData.status = "shipped";
            setData.sellerStatus = "handed_to_rider";
            setData.shippedAt = now;
            setData.handedToRiderAt = now;
        }

        if (deliveryStatus === "delivered") {
            setData.status = "delivered";
            setData.sellerStatus = "handed_to_rider";
            setData.deliveredAt = now;
        }

        if (deliveryStatus === "returned") {
            setData.status = "returned";
            setData.returnedAt = now;
        }

        if (deliveryStatus === "failed" && remark) {
            setData.failureReason = remark;
        }
    }

    private async syncParentOrderStatus(parentOrderId: string, adminUserId?: string) {
        const vendorOrders: any[] = await this.repo.findActiveVendorOrdersByParentOrder(parentOrderId);
        if (!vendorOrders.length) return;

        const statuses = vendorOrders.map((item) => item.status);
        let parentStatus = "placed";

        const allCancelled = statuses.every((status) => status === "cancelled");
        const someCancelled = statuses.some((status) => status === "cancelled");
        const allDelivered = statuses.every((status) => status === "delivered");
        const someDelivered = statuses.some((status) => status === "delivered");
        const allShipped = statuses.every((status) => ["shipped", "delivered"].includes(status));
        const someShipped = statuses.some((status) => ["shipped", "delivered"].includes(status));
        const allReady = statuses.every((status) => ["ready_for_pickup", "shipped", "delivered"].includes(status));
        const someReady = statuses.some((status) => ["ready_for_pickup", "shipped", "delivered"].includes(status));
        const someProcessing = statuses.some((status) =>
            ["seller_accepted", "picking_products", "packing_order"].includes(status)
        );

        if (allCancelled) parentStatus = "cancelled";
        else if (someCancelled) parentStatus = "partially_cancelled";
        else if (allDelivered) parentStatus = "delivered";
        else if (someDelivered) parentStatus = "partially_delivered";
        else if (allShipped) parentStatus = "shipped";
        else if (someShipped) parentStatus = "partially_shipped";
        else if (allReady) parentStatus = "ready_for_pickup";
        else if (someReady) parentStatus = "partially_ready";
        else if (someProcessing) parentStatus = "processing";

        const parent: any = await this.repo.findParentOrderById(parentOrderId);
        if (!parent || parent.status === parentStatus) return;

        await this.repo.updateParentOrder(parentOrderId, {
            $set: { status: parentStatus },
            $push: {
                trackingHistory: {
                    title: "Parent order status synced",
                    status: parentStatus,
                    remark: `Parent order synced from ${vendorOrders.length} vendor order(s) after admin update`,
                    ...this.updatedBy(adminUserId),
                    updatedByRole: "admin",
                    updatedAt: new Date(),
                },
            },
        });
    }

    private buildVendorRemark(existing: any, changes: Record<string, any>) {
        const messages: string[] = [];

        if (changes.status) messages.push(`status ${existing.status} -> ${changes.status}`);
        if (changes.sellerStatus) messages.push(`sellerStatus ${existing.sellerStatus} -> ${changes.sellerStatus}`);
        if (changes.deliveryStatus) messages.push(`deliveryStatus ${existing.deliveryStatus} -> ${changes.deliveryStatus}`);
        if (changes.paymentStatus) messages.push(`paymentStatus ${existing.paymentStatus} -> ${changes.paymentStatus}`);

        return messages.length
            ? `Admin updated vendor order: ${messages.join(", ")}`
            : "Admin updated vendor order";
    }

    private updatedBy(adminUserId?: string) {
        return adminUserId && Types.ObjectId.isValid(adminUserId)
            ? { updatedBy: new Types.ObjectId(adminUserId) }
            : {};
    }

    private clean(value: unknown) {
        if (value === undefined || value === null) return undefined;
        const normalized = String(value).trim().toLowerCase();
        return normalized || undefined;
    }

    private ensureObjectId(value: string, field: string) {
        if (!value || !Types.ObjectId.isValid(value)) {
            throw new Error(`Invalid ${field}`);
        }
    }

    private ensureAllowed(value: string, allowed: readonly string[], label: string) {
        if (!allowed.includes(value)) {
            throw new Error(`Invalid ${label}: ${value}`);
        }
    }
}
