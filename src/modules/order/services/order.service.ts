import { ProductModel } from "../../product/models/product.model.js";
import { OrderRepository } from "../repository/order.repository.js";
import { generateOrderNumber } from "../utils/ordernumbergenerate.util.js";
import type { OrderStatus } from "../interfaces/order.interface.js";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";
import { Types } from "mongoose";
import {
    AdminOrdersRepository,
} from "../repository/adminorders.repository.js";

import type {
    AdminOrderSortBy,
    AdminOrderSortOrder,
    IAdminOrderFilters,
    IAdminOrdersResult,
} from "../interfaces/adminorders.interface.js";

const round = (num: number) => Math.round(Number(num || 0) * 100) / 100;

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const generatePickupQrCode = (orderNumber: string, vendorOrderNumber: string) => {
    return `PICKUP-${orderNumber}-${vendorOrderNumber}-${Date.now()}-${Math.floor(
        1000 + Math.random() * 9000
    )}`;
};

const allowedParentStatuses: OrderStatus[] = [
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
];

const isDuplicateOrderNumberError = (error: any) => {
    return (
        error?.code === 11000 &&
        (
            error?.keyPattern?.orderNumber ||
            error?.keyValue?.orderNumber ||
            String(error?.message || "").includes("orderNumber")
        )
    );
};

const toNumberOrNull = (value: any) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeOrderAddress = (address: any) => {
    if (!address) {
        return undefined;
    }

    const plainAddress =
        typeof address.toObject === "function"
            ? address.toObject()
            : { ...address };

    const locationCoordinates = plainAddress.location?.coordinates;

    const latitude = toNumberOrNull(
        plainAddress.latitude ??
        plainAddress.lat ??
        plainAddress.location?.latitude ??
        plainAddress.location?.lat ??
        locationCoordinates?.[1]
    );

    const longitude = toNumberOrNull(
        plainAddress.longitude ??
        plainAddress.lng ??
        plainAddress.location?.longitude ??
        plainAddress.location?.lng ??
        locationCoordinates?.[0]
    );

    plainAddress.latitude = latitude;
    plainAddress.longitude = longitude;
    plainAddress.lat = latitude;
    plainAddress.lng = longitude;

    if (!plainAddress.postalCode && plainAddress.pincode) {
        plainAddress.postalCode = plainAddress.pincode;
    }

    if (!plainAddress.pincode && plainAddress.postalCode) {
        plainAddress.pincode = plainAddress.postalCode;
    }

    if (!plainAddress.fullAddress) {
        plainAddress.fullAddress = [
            plainAddress.addressLine1,
            plainAddress.addressLine2,
            plainAddress.landmark,
            plainAddress.city,
            plainAddress.state,
            plainAddress.pincode || plainAddress.postalCode,
            plainAddress.country || "India",
        ]
            .filter(Boolean)
            .join(", ");
    }

    if (latitude !== null && longitude !== null) {
        plainAddress.location = {
            type: "Point",
            coordinates: [longitude, latitude],
        };
    } else {
        delete plainAddress.location;
    }

    if (!plainAddress.country) {
        plainAddress.country = "India";
    }

    return plainAddress;
};

export class OrderService {
    private repo = new OrderRepository();
    private adminOrdersRepository = new AdminOrdersRepository();

    async create(data: any) {
        if (!data) {
            throw new Error("Order data is required");
        }

        if (!data.user) {
            throw new Error("User is required");
        }

        if (!data.paymentMethod) {
            throw new Error("Payment method is required");
        }

        if (!Array.isArray(data.items) || data.items.length === 0) {
            throw new Error("Order must contain at least one item");
        }

        this.removeOperationalFields(data);

        delete data.orderNumber;

        const billingAddress = normalizeOrderAddress(data.billingAddress);
        const shippingAddress = normalizeOrderAddress(
            data.shippingAddress || data.billingAddress
        );

        let calculatedSubtotal = 0;
        const preparedItems: any[] = [];
        const vendorIdsSet = new Set<string>();

        for (const item of data.items) {
            if (!item.product) {
                throw new Error("Product is required in order item");
            }

            const product: any = await ProductModel.findById(item.product);

            if (!product) {
                throw new Error("Product not found");
            }

            const vendorId =
                item.vendor ||
                product.vendor ||
                product.user;

            if (!vendorId) {
                throw new Error(`Vendor not found for product ${item.product}`);
            }

            const price = round(Number(item.price ?? product.price ?? 0));

            const mrp =
                item.mrp !== undefined
                    ? round(Number(item.mrp))
                    : product.mrp !== undefined
                        ? round(Number(product.mrp))
                        : price;

            const quantity = Number(item.quantity || 0);

            if (price < 0) {
                throw new Error("Invalid item price");
            }

            if (quantity <= 0) {
                throw new Error("Invalid item quantity");
            }

            const itemTotal = round(price * quantity);

            calculatedSubtotal += itemTotal;
            vendorIdsSet.add(String(vendorId));

            preparedItems.push({
                vendor: vendorId,
                product: item.product,
                variant: item.variant || null,
                name: item.name || product.name || product.productName || "Product",
                sku: item.sku || product.sku,
                price,
                mrp,
                quantity,
                images: item.images || product.images || [],
                total: itemTotal,
            });
        }

        calculatedSubtotal = round(calculatedSubtotal);

        const vendorIds = Array.from(vendorIdsSet);

        const subtotal = round(Number(data.subtotal ?? calculatedSubtotal));
        const discount = round(Number(data.discount ?? 0));
        const shippingCharge = round(
            Number(data.shippingCharge ?? data.deliveryFee ?? 0)
        );
        const gstAmount = round(Number(data.gstAmount ?? data.feeGst ?? 0));

        const totalAmount = round(
            Number(
                data.totalAmount ??
                subtotal - discount + shippingCharge + gstAmount
            )
        );

        const paymentMode = data.paymentMode === "cod" ? "cod" : "online";

        const paymentStatus =
            data.paymentStatus === "success"
                ? "success"
                : data.paymentStatus === "failed"
                    ? "failed"
                    : data.paymentStatus === "refunded"
                        ? "refunded"
                        : "pending";

        const status: OrderStatus =
            paymentStatus === "success"
                ? "placed"
                : paymentMode === "cod"
                    ? "placed"
                    : "pending";

        if (!allowedParentStatuses.includes(status)) {
            throw new Error("Invalid order status");
        }

        let lastDuplicateError: any = null;

        for (let attempt = 1; attempt <= 20; attempt++) {
            const orderNumber = await generateOrderNumber();

            const orderPayload: any = {
                user: data.user,

                vendor: vendorIds.length === 1 ? vendorIds[0] : undefined,

                vendors: vendorIds,
                orderType: vendorIds.length > 1 ? "multi_vendor" : "single_vendor",
                vendorOrderCount: vendorIds.length,

                orderNumber,
                items: preparedItems,

                billingAddress,
                shippingAddress,

                paymentMethod: data.paymentMethod,
                paymentTransaction: data.paymentTransaction,

                subtotal,
                discount,

                gstRuleId: data.gstRuleId,
                gstAmount,

                shippingCharge,
                totalAmount,

                paymentStatus,
                paymentMode,

                status,

                trackingHistory: [
                    {
                        title:
                            status === "placed"
                                ? "Order placed"
                                : "Order created",
                        status,
                        remark:
                            paymentStatus === "success"
                                ? "Payment successful and order placed"
                                : paymentMode === "cod"
                                    ? "COD order placed successfully"
                                    : "Online order created, waiting for payment verification",
                        updatedBy: data.user,
                        updatedByRole: "user",
                        updatedAt: new Date(),
                    },
                ],

                notes: data.notes,
                isActive: data.isActive ?? true,
            };

            try {
                const parentOrder = await this.repo.create(orderPayload);

                const vendorOrders =
                    await this.createVendorOrdersFromParentOrder(parentOrder);

                return {
                    order: parentOrder,
                    vendorOrders,
                };
            } catch (error: any) {
                if (isDuplicateOrderNumberError(error)) {
                    lastDuplicateError = error;
                    continue;
                }

                throw error;
            }
        }

        throw new Error(
            `Unable to generate unique order number. Please try again. ${lastDuplicateError?.keyValue?.orderNumber
                ? `Duplicate: ${lastDuplicateError.keyValue.orderNumber}`
                : ""
            }`
        );
    }

    async getById(id: any) {
        const order = await this.repo.findById(id);

        if (!order) {
            throw new Error("Order not found");
        }

        const vendorOrders = await OrderVendorModel.find({
            parentOrder: order._id,
            isActive: true,
        })
            .populate("vendor", "firstName lastName email mobileNumber")
            .populate("driver")
            .populate("items.product")
            .sort({ createdAt: 1 });

        return {
            order,
            vendorOrders,
        };
    }

    async getAll(page = 1, limit = 10, filter: any = {}) {
        return await this.repo.findAll(filter, page, limit);
    }

    async getUserOrders(
        userId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        return await this.repo.findByUser(
            userId,
            page,
            limit,
            filter
        );
    }

    async getVendorParentOrders(
        vendorId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        return await this.repo.findByVendorInParentOrder(
            vendorId,
            page,
            limit,
            filter
        );
    }

    async update(id: any, data: any) {
        const existing = await this.repo.findById(id);

        if (!existing) {
            throw new Error("Order not found");
        }

        delete data.orderNumber;
        delete data.user;
        delete data.vendor;
        delete data.vendors;
        delete data.vendorOrderCount;
        delete data.orderType;
        delete data.items;

        this.removeOperationalFields(data);

        if (data.billingAddress) {
            data.billingAddress = normalizeOrderAddress(data.billingAddress);
        }

        if (data.shippingAddress) {
            data.shippingAddress = normalizeOrderAddress(data.shippingAddress);
        }

        if (data.paymentStatus === "success") {
            data.status = "placed";
        }

        if (data.status && !allowedParentStatuses.includes(data.status)) {
            throw new Error("Invalid order status");
        }

        const updatedOrder = await this.repo.update(id, data);

        if (data.paymentStatus === "success") {
            await this.syncVendorOrdersPaymentSuccess(id);
        }

        return updatedOrder;
    }

    async updateStatus(id: any, status: OrderStatus) {
        const existing = await this.repo.findById(id);

        if (!existing) {
            throw new Error("Order not found");
        }

        if (!status) {
            throw new Error("Status is required");
        }

        if (!allowedParentStatuses.includes(status)) {
            throw new Error("Invalid order status");
        }

        return await this.repo.update(id, {
            $set: {
                status,
            },
            $push: {
                trackingHistory: {
                    title: "Order status updated",
                    status,
                    remark: `Parent order status updated to ${status}`,
                    updatedByRole: "system",
                    updatedAt: new Date(),
                },
            },
        });
    }

    async markPaymentSuccess(
        orderId: any,
        paymentTransactionId?: any
    ) {
        const existing = await this.repo.findById(orderId);

        if (!existing) {
            throw new Error("Order not found");
        }

        if (existing.paymentStatus === "success") {
            const vendorOrders = await OrderVendorModel.find({
                parentOrder: orderId,
                isActive: true,
            })
                .populate("vendor", "firstName lastName email mobileNumber")
                .populate("driver")
                .populate("items.product")
                .sort({ createdAt: 1 });

            return {
                order: existing,
                vendorOrders,
                alreadyProcessed: true,
            };
        }

        const parentUpdateData: any = {
            $set: {
                paymentStatus: "success",
                status: "placed",
            },
            $push: {
                trackingHistory: {
                    title: "Payment successful",
                    status: "placed",
                    remark: "Payment successful and order placed",
                    updatedByRole: "system",
                    updatedAt: new Date(),
                },
            },
        };

        if (paymentTransactionId) {
            parentUpdateData.$set.paymentTransaction = paymentTransactionId;
        }

        const updatedParentOrder = await this.repo.update(
            orderId,
            parentUpdateData
        );

        await this.syncVendorOrdersPaymentSuccess(orderId);

        const vendorOrders = await OrderVendorModel.find({
            parentOrder: orderId,
            isActive: true,
        })
            .populate("vendor", "firstName lastName email mobileNumber")
            .populate("driver")
            .populate("items.product")
            .sort({ createdAt: 1 });

        return {
            order: updatedParentOrder,
            vendorOrders,
            alreadyProcessed: false,
        };
    }

    async delete(id: any) {
        const existing = await this.repo.findById(id);

        if (!existing) {
            throw new Error("Order not found");
        }

        await OrderVendorModel.updateMany(
            {
                parentOrder: id,
            },
            {
                $set: {
                    isActive: false,
                },
            }
        );

        return await this.repo.softDelete(id);
    }

    private async createVendorOrdersFromParentOrder(parentOrder: any) {
        const existingVendorOrders = await OrderVendorModel.countDocuments({
            parentOrder: parentOrder._id,
        });

        if (existingVendorOrders > 0) {
            return await OrderVendorModel.find({
                parentOrder: parentOrder._id,
            });
        }

        const groups = new Map<string, any[]>();

        for (const item of parentOrder.items || []) {
            const vendorId = item.vendor?.toString();

            if (!vendorId) {
                throw new Error("Vendor missing in parent order item");
            }

            if (!groups.has(vendorId)) {
                groups.set(vendorId, []);
            }

            groups.get(vendorId)!.push(item);
        }

        const vendorOrders = [];
        let index = 1;

        const vendorOrderStatus =
            parentOrder.paymentStatus === "success"
                ? "placed"
                : parentOrder.paymentMode === "cod"
                    ? "placed"
                    : "pending";

        const vendorPaymentStatus =
            parentOrder.paymentStatus || "pending";

        const billingAddress = normalizeOrderAddress(parentOrder.billingAddress);
        const shippingAddress = normalizeOrderAddress(parentOrder.shippingAddress);

        for (const [vendorId, items] of groups.entries()) {
            const vendorSubtotal = round(
                items.reduce(
                    (sum, item) => sum + Number(item.total || 0),
                    0
                )
            );

            const vendorOrderNumber = `${parentOrder.orderNumber}-V${index}`;
            const pickupOtp = generateOtp();
            const deliveryOtp = generateOtp();
            const pickupQrCode = generatePickupQrCode(
                parentOrder.orderNumber,
                vendorOrderNumber
            );

            const vendorOrder = await OrderVendorModel.create({
                parentOrder: parentOrder._id,

                user: parentOrder.user,
                vendor: vendorId,

                orderNumber: parentOrder.orderNumber,
                vendorOrderNumber,

                items: items.map((item: any) => ({
                    product: item.product,
                    variant: item.variant || null,
                    name: item.name,
                    sku: item.sku,
                    price: item.price,
                    mrp: item.mrp,
                    quantity: item.quantity,
                    images: item.images,
                    total: item.total,
                })),

                billingAddress,
                shippingAddress,

                paymentMethod: parentOrder.paymentMethod,
                paymentTransaction: parentOrder.paymentTransaction,

                subtotal: vendorSubtotal,
                discount: 0,
                gstAmount: 0,
                shippingCharge: 0,
                totalAmount: vendorSubtotal,

                paymentStatus: vendorPaymentStatus,
                paymentMode: parentOrder.paymentMode,

                status: vendorOrderStatus,
                sellerStatus: "pending_acceptance",
                deliveryStatus: "not_assigned",

                pickupVerification: {
                    pickupOtp,
                    pickupQrCode,
                    otpVerified: false,
                    qrVerified: false,
                },

                customerVerification: {
                    deliveryOtp,
                    otpVerified: false,
                    signatureTaken: false,
                },

                trackingHistory: [
                    {
                        title:
                            vendorOrderStatus === "placed"
                                ? "Vendor order placed"
                                : "Vendor order created",
                        status: vendorOrderStatus,
                        remark:
                            vendorPaymentStatus === "success"
                                ? "Payment successful and vendor order placed"
                                : parentOrder.paymentMode === "cod"
                                    ? "COD vendor order placed"
                                    : "Vendor order created from parent order, waiting for payment verification",
                        updatedBy: parentOrder.user,
                        updatedByRole: "user",
                        updatedAt: new Date(),
                    },
                    {
                        title: "Verification OTP generated",
                        status: vendorOrderStatus,
                        remark: "Pickup and delivery verification OTPs generated",
                        updatedBy: parentOrder.user,
                        updatedByRole: "system",
                        updatedAt: new Date(),
                    },
                ],

                isActive: true,
            });

            vendorOrders.push(vendorOrder);
            index++;
        }

        return vendorOrders;
    }

    private async syncVendorOrdersPaymentSuccess(parentOrderId: any) {
        const vendorOrders = await OrderVendorModel.find({
            parentOrder: parentOrderId,
            isActive: true,
        }).select(
            "+pickupVerification.pickupOtp +pickupVerification.pickupQrCode +customerVerification.deliveryOtp"
        );

        for (const vendorOrder of vendorOrders as any[]) {
            const setData: any = {
                paymentStatus: "success",
                status: "placed",
            };

            if (!vendorOrder.pickupVerification?.pickupOtp) {
                setData["pickupVerification.pickupOtp"] = generateOtp();
            }

            if (!vendorOrder.pickupVerification?.pickupQrCode) {
                setData["pickupVerification.pickupQrCode"] =
                    generatePickupQrCode(
                        vendorOrder.orderNumber,
                        vendorOrder.vendorOrderNumber
                    );
            }

            if (vendorOrder.pickupVerification?.otpVerified === undefined) {
                setData["pickupVerification.otpVerified"] = false;
            }

            if (vendorOrder.pickupVerification?.qrVerified === undefined) {
                setData["pickupVerification.qrVerified"] = false;
            }

            if (!vendorOrder.customerVerification?.deliveryOtp) {
                setData["customerVerification.deliveryOtp"] = generateOtp();
            }

            if (vendorOrder.customerVerification?.otpVerified === undefined) {
                setData["customerVerification.otpVerified"] = false;
            }

            if (vendorOrder.customerVerification?.signatureTaken === undefined) {
                setData["customerVerification.signatureTaken"] = false;
            }

            await OrderVendorModel.updateOne(
                {
                    _id: vendorOrder._id,
                    isActive: true,
                },
                {
                    $set: setData,
                    $push: {
                        trackingHistory: {
                            title: "Payment successful",
                            status: "placed",
                            remark: "Payment successful and vendor order placed",
                            updatedByRole: "system",
                            updatedAt: new Date(),
                        },
                    },
                }
            );
        }
    }

    private removeOperationalFields(data: any) {
        delete data.driver;

        delete data.sellerStatus;
        delete data.deliveryStatus;

        delete data.sellerAcceptDeadlineAt;
        delete data.sellerAcceptedAt;
        delete data.pickingStartedAt;
        delete data.packingStartedAt;
        delete data.readyForPickupAt;
        delete data.handedToRiderAt;

        delete data.driverAssignedAt;
        delete data.deliveryAcceptedAt;
        delete data.proceedingToStoreAt;
        delete data.reachedStoreAt;
        delete data.waitingForPackingAt;
        delete data.pickedUpAt;
        delete data.outForDeliveryAt;
        delete data.deliveredAt;

        delete data.shippedAt;
        delete data.cancelledAt;
        delete data.returnedAt;

        delete data.pickupVerification;
        delete data.customerVerification;

        delete data.deliveryOtp;
        delete data.otpVerified;

        delete data.tracking;
        delete data.courierName;

        delete data.isLiveTrackingEnabled;
        delete data.currentLocation;

        delete data.cancellationReasonFromVendor;
        delete data.failureReasonFromDriver;
    }

    async getAdminOrders(
        query:
            Record<string, unknown>,
    ): Promise<IAdminOrdersResult> {

        const filters =
            this.buildAdminOrderFilters(
                query,
            );


        const result =
            await this.adminOrdersRepository
                .findAll(
                    filters,
                );


        const totalPages =
            result.total > 0
                ? Math.ceil(
                    result.total /
                    filters.limit,
                )
                : 0;


        return {
            orders:
                result.orders,

            pagination: {
                page:
                    filters.page,

                limit:
                    filters.limit,

                total:
                    result.total,

                totalPages,

                hasNextPage:
                    filters.page <
                    totalPages,

                hasPreviousPage:
                    filters.page >
                    1,
            },

            summary:
                result.summary,
        };
    }


    async getAdminOrderById(
        orderId:
            any,
    ) {
        if (
            !orderId
            ||
            !Types.ObjectId.isValid(
                orderId,
            )
        ) {
            throw new Error(
                "Invalid order id",
            );
        }


        const order =
            await this.adminOrdersRepository
                .findById(
                    orderId,
                );


        if (!order) {
            throw new Error(
                "Order not found",
            );
        }


        return order;
    }

    private buildAdminOrderFilters(
        query:
            Record<string, unknown>,
    ): IAdminOrderFilters {

        const page =
            this.parseAdminPositiveInteger(
                query.page,
                1,
            );


        const requestedLimit =
            this.parseAdminPositiveInteger(
                query.limit,
                20,
            );


        /**
         * Admin order records contain
         * parent + vendorOrders[], so keep
         * maximum page size controlled.
         */
        const limit =
            Math.min(
                requestedLimit,
                100,
            );


        const search =
            this.getAdminOptionalString(
                query.search,
            );


        /**
         * ========================================================
         * PARENT ORDER FILTERS
         * ========================================================
         */

        const status =
            this.validateAdminMultipleValues(
                query.status,

                [
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
                ],

                "order status",
            );


        const paymentStatus =
            this.validateAdminMultipleValues(
                query.paymentStatus,

                [
                    "pending",
                    "success",
                    "failed",
                    "refunded",
                ],

                "payment status",
            );


        const paymentMode =
            this.validateAdminMultipleValues(
                query.paymentMode,

                [
                    "cod",
                    "online",
                ],

                "payment mode",
            );


        const orderType =
            this.validateAdminMultipleValues(
                query.orderType,

                [
                    "single_vendor",
                    "multi_vendor",
                ],

                "order type",
            );


        /**
         * ========================================================
         * VENDOR ORDER FILTERS
         * ========================================================
         */

        const vendorOrderStatus =
            this.validateAdminMultipleValues(
                query.vendorOrderStatus,

                [
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
                ],

                "vendor order status",
            );


        const sellerStatus =
            this.validateAdminMultipleValues(
                query.sellerStatus,

                [
                    "pending_acceptance",
                    "accepted",
                    "picking_products",
                    "packing_order",
                    "ready_for_pickup",
                    "handed_to_rider",
                    "cancelled",
                ],

                "seller status",
            );


        const deliveryStatus =
            this.validateAdminMultipleValues(
                query.deliveryStatus,

                [
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
                ],

                "delivery status",
            );


        const vendorPaymentStatus =
            this.validateAdminMultipleValues(
                query.vendorPaymentStatus,

                [
                    "pending",
                    "success",
                    "failed",
                    "refunded",
                ],

                "vendor payment status",
            );


        /**
         * ========================================================
         * IDS
         * ========================================================
         */

        const userId =
            this.validateAdminObjectId(
                query.userId,
                "userId",
            );


        const vendorId =
            this.validateAdminObjectId(
                query.vendorId,
                "vendorId",
            );


        const driverId =
            this.validateAdminObjectId(
                query.driverId,
                "driverId",
            );


        const paymentMethodId =
            this.validateAdminObjectId(
                query.paymentMethodId,
                "paymentMethodId",
            );


        const paymentTransactionId =
            this.validateAdminObjectId(
                query.paymentTransactionId,
                "paymentTransactionId",
            );


        /**
         * ========================================================
         * AMOUNT
         * ========================================================
         */

        const minAmount =
            this.parseAdminAmount(
                query.minAmount,
                "minAmount",
            );


        const maxAmount =
            this.parseAdminAmount(
                query.maxAmount,
                "maxAmount",
            );


        if (
            minAmount !==
            undefined
            &&
            maxAmount !==
            undefined
            &&
            minAmount >
            maxAmount
        ) {
            throw new Error(
                "minAmount cannot be greater than maxAmount",
            );
        }


        /**
         * ========================================================
         * DATE
         * ========================================================
         */

        const fromDate =
            this.parseAdminDate(
                query.fromDate,
                false,
            );


        const toDate =
            this.parseAdminDate(
                query.toDate,
                true,
            );


        if (
            fromDate
            &&
            toDate
            &&
            fromDate.getTime() >
            toDate.getTime()
        ) {
            throw new Error(
                "fromDate cannot be after toDate",
            );
        }


        /**
         * ========================================================
         * BOOLEAN FILTERS
         * ========================================================
         */

        const isActive =
            this.parseAdminBoolean(
                query.isActive,
                "isActive",
            );


        const vendorOrderIsActive =
            this.parseAdminBoolean(
                query.vendorOrderIsActive,
                "vendorOrderIsActive",
            );


        const hasDriver =
            this.parseAdminBoolean(
                query.hasDriver,
                "hasDriver",
            );


        const liveTracking =
            this.parseAdminBoolean(
                query.liveTracking,
                "liveTracking",
            );


        /**
         * ========================================================
         * SORT
         * ========================================================
         */

        const sortBy =
            this.parseAdminSortBy(
                query.sortBy,
            );


        const sortOrder =
            this.parseAdminSortOrder(
                query.sortOrder,
            );


        return {
            ...(search
                ? {
                    search,
                }
                : {}),


            ...(status
                ? {
                    status,
                }
                : {}),


            ...(paymentStatus
                ? {
                    paymentStatus,
                }
                : {}),


            ...(paymentMode
                ? {
                    paymentMode,
                }
                : {}),


            ...(orderType
                ? {
                    orderType,
                }
                : {}),


            ...(userId
                ? {
                    userId,
                }
                : {}),


            ...(vendorId
                ? {
                    vendorId,
                }
                : {}),


            ...(driverId
                ? {
                    driverId,
                }
                : {}),


            ...(paymentMethodId
                ? {
                    paymentMethodId,
                }
                : {}),


            ...(paymentTransactionId
                ? {
                    paymentTransactionId,
                }
                : {}),


            ...(vendorOrderStatus
                ? {
                    vendorOrderStatus,
                }
                : {}),


            ...(sellerStatus
                ? {
                    sellerStatus,
                }
                : {}),


            ...(deliveryStatus
                ? {
                    deliveryStatus,
                }
                : {}),


            ...(vendorPaymentStatus
                ? {
                    vendorPaymentStatus,
                }
                : {}),


            ...(minAmount !==
                undefined
                ? {
                    minAmount,
                }
                : {}),


            ...(maxAmount !==
                undefined
                ? {
                    maxAmount,
                }
                : {}),


            ...(fromDate
                ? {
                    fromDate,
                }
                : {}),


            ...(toDate
                ? {
                    toDate,
                }
                : {}),


            ...(isActive !==
                undefined
                ? {
                    isActive,
                }
                : {}),


            ...(vendorOrderIsActive !==
                undefined
                ? {
                    vendorOrderIsActive,
                }
                : {}),


            ...(hasDriver !==
                undefined
                ? {
                    hasDriver,
                }
                : {}),


            ...(liveTracking !==
                undefined
                ? {
                    liveTracking,
                }
                : {}),


            page,

            limit,

            sortBy,

            sortOrder,
        };
    }


    private getAdminOptionalString(
        value:
            unknown,
    ): string | undefined {

        if (
            value ===
            undefined
            ||
            value ===
            null
        ) {
            return undefined;
        }


        const normalized =
            String(
                value,
            )
                .trim();


        return normalized
            || undefined;
    }


    private parseAdminPositiveInteger(
        value:
            unknown,

        fallback:
            number,
    ): number {

        if (
            value ===
            undefined
            ||
            value ===
            null
            ||
            value ===
            ""
        ) {
            return fallback;
        }


        const parsed =
            Number(
                value,
            );


        if (
            !Number.isInteger(
                parsed,
            )
            ||
            parsed <=
            0
        ) {
            return fallback;
        }


        return parsed;
    }


    private parseAdminAmount(
        value:
            unknown,

        fieldName:
            string,
    ): number | undefined {

        if (
            value ===
            undefined
            ||
            value ===
            null
            ||
            value ===
            ""
        ) {
            return undefined;
        }


        const amount =
            Number(
                value,
            );


        if (
            !Number.isFinite(
                amount,
            )
            ||
            amount <
            0
        ) {
            throw new Error(
                `${fieldName} must be a valid non-negative number`,
            );
        }


        return amount;
    }


    private parseAdminBoolean(
        value:
            unknown,

        fieldName:
            string,
    ): boolean | undefined {

        if (
            value ===
            undefined
            ||
            value ===
            null
            ||
            value ===
            ""
        ) {
            return undefined;
        }


        const normalized =
            String(
                value,
            )
                .trim()
                .toLowerCase();


        if (
            normalized ===
            "true"
        ) {
            return true;
        }


        if (
            normalized ===
            "false"
        ) {
            return false;
        }


        throw new Error(
            `${fieldName} must be true or false`,
        );
    }


    private parseAdminDate(
        value:
            unknown,

        endOfDay:
            boolean,
    ): Date | undefined {

        if (
            value ===
            undefined
            ||
            value ===
            null
            ||
            value ===
            ""
        ) {
            return undefined;
        }


        const raw =
            String(
                value,
            )
                .trim();


        const isDateOnly =
            /^\d{4}-\d{2}-\d{2}$/
                .test(
                    raw,
                );


        const date =
            isDateOnly
                ? new Date(
                    `${raw}T${endOfDay
                        ? "23:59:59.999"
                        : "00:00:00.000"
                    }`,
                )

                : new Date(
                    raw,
                );


        if (
            Number.isNaN(
                date.getTime(),
            )
        ) {
            throw new Error(
                `Invalid date: ${raw}`,
            );
        }


        return date;
    }


    private validateAdminObjectId(
        value:
            unknown,

        fieldName:
            string,
    ): string | undefined {

        const normalized =
            this.getAdminOptionalString(
                value,
            );


        if (
            !normalized
        ) {
            return undefined;
        }


        if (
            !Types.ObjectId.isValid(
                normalized,
            )
        ) {
            throw new Error(
                `${fieldName} is invalid`,
            );
        }


        return normalized;
    }


    private validateAdminMultipleValues(
        value:
            unknown,

        allowedValues:
            readonly string[],

        fieldName:
            string,
    ): string | undefined {

        const normalized =
            this.getAdminOptionalString(
                value,
            );


        if (
            !normalized
        ) {
            return undefined;
        }


        const values =
            normalized
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


        const invalid =
            values.filter(
                item =>
                    !allowedValues.includes(
                        item,
                    ),
            );


        if (
            invalid.length >
            0
        ) {
            throw new Error(
                `Invalid ${fieldName}: ${invalid.join(", ")}`,
            );
        }


        return values.join(
            ",",
        );
    }


    private parseAdminSortBy(
        value:
            unknown,
    ): AdminOrderSortBy {

        const allowed:
            AdminOrderSortBy[] = [
                "createdAt",
                "updatedAt",
                "totalAmount",
                "subtotal",
                "orderNumber",
                "status",
                "paymentStatus",
            ];


        const normalized =
            this.getAdminOptionalString(
                value,
            ) as
            AdminOrderSortBy
            | undefined;


        if (
            normalized
            &&
            allowed.includes(
                normalized,
            )
        ) {
            return normalized;
        }


        return "createdAt";
    }


    private parseAdminSortOrder(
        value:
            unknown,
    ): AdminOrderSortOrder {

        return this
            .getAdminOptionalString(
                value,
            )
            ?.toLowerCase() ===
            "asc"

            ? "asc"
            : "desc";
    }
}