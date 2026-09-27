import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";
import { OrderModel } from "../models/order.model.js";
import { DriverOrderRepository } from "../repository/driverorders.repository.js";

const validDeliveryTransitions: Record<string, string[]> = {
    not_assigned: [
        "assigned",
        "delivery_accepted",
    ],

    assigned: [
        "delivery_accepted",
        "proceeding_to_store",
    ],

    delivery_accepted: [
        "proceeding_to_store",
        "reached_store",
        "failed",
    ],

    proceeding_to_store: [
        "reached_store",
        "failed",
    ],

    reached_store: [
        "waiting_for_packing",
        "pickup_verification_pending",
        // Outside/custom vendors do not have seller-app OTP verification.
        "picked_up",
        "failed",
    ],

    waiting_for_packing: [
        "pickup_verification_pending",
        "failed",
    ],

    pickup_verification_pending: [
        "pickup_verified",
        "failed",
    ],

    pickup_verified: [
        "picked_up",
        "failed",
    ],

    picked_up: [
        "out_for_delivery",
        "failed",
    ],

    out_for_delivery: [
        "reached_customer",
        "failed",
        "returned",
    ],

    reached_customer: [
        "customer_verification_pending",
        "failed",
        "returned",
    ],

    customer_verification_pending: [
        "delivered",
        "failed",
        "returned",
    ],

    delivered: [],
    failed: ["returned"],
    returned: [],
};

const deliveryStatusTitleMap: Record<string, string> = {
    assigned: "Driver assigned",
    delivery_accepted: "Delivery accepted by rider",
    proceeding_to_store: "Rider proceeding to store",
    reached_store: "Rider reached store",
    waiting_for_packing: "Rider waiting for packing",
    pickup_verification_pending: "Pickup verification pending",
    pickup_verified: "Pickup verified",
    picked_up: "Package collected by rider",
    out_for_delivery: "Rider started delivery",
    reached_customer: "Rider reached customer",
    customer_verification_pending: "Customer verification pending",
    delivered: "Delivery completed",
    failed: "Delivery failed",
    returned: "Order returned",
};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const generatePickupQrCode = (orderId: string) => {
    return `PICKUP-${orderId}-${Date.now()}`;
};

export class DriverOrderService {
    private repo = new DriverOrderRepository();

    private normalizePage(value: any) {
        const page = Number(value) || 1;
        return page < 1 ? 1 : page;
    }

    private normalizeLimit(value: any) {
        const limit = Number(value) || 10;
        return limit < 1 ? 10 : Math.min(limit, 100);
    }

    async assignDriver(orderId: any, driverId: string) {
        if (!orderId) {
            throw new Error("orderId is required");
        }

        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        const order = await this.repo.findById(orderId);

        if (!order) {
            throw new Error("Order not found");
        }

        if (order.driver) {
            throw new Error("Driver already assigned");
        }

        if (order.deliveryStatus && order.deliveryStatus !== "not_assigned") {
            throw new Error(
                `Order is not available for assignment. Current delivery status: ${order.deliveryStatus}`
            );
        }

        if (
            ![
                "placed",
                "seller_accepted",
                "picking_products",
                "packing_order",
                "ready_for_pickup",
            ].includes(order.status)
        ) {
            throw new Error(
                `Order is not available for driver assignment. Current status: ${order.status}`
            );
        }

        const updateData: any = {
            driver: driverId,
            deliveryStatus: "assigned",
            driverAssignedAt: new Date(),
            $push: {
                trackingHistory: {
                    title: "Driver assigned",
                    status: "assigned",
                    remark: "Driver assigned for this order.",
                    updatedBy: driverId,
                    updatedByRole: "driver",
                    updatedAt: new Date(),
                },
            },
        };

        const updatedOrder = await this.repo.assignDriver(
            orderId,
            driverId,
            updateData
        );

        if (!updatedOrder) {
            throw new Error("Order is already assigned or not available");
        }

        return updatedOrder;
    }

    async takeOrder(orderId: any, driverId: string) {
        if (!orderId) {
            throw new Error("orderId is required");
        }

        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        const order = await this.repo.findById(orderId);

        if (!order) {
            throw new Error("Order not found");
        }

        if (order.driver) {
            throw new Error("Order is already assigned to a driver");
        }

        if (order.deliveryStatus && order.deliveryStatus !== "not_assigned") {
            throw new Error(
                `Order is not available. Current delivery status: ${order.deliveryStatus}`
            );
        }

        if (
            ![
                "placed",
                "seller_accepted",
                "picking_products",
                "packing_order",
                "ready_for_pickup",
            ].includes(order.status)
        ) {
            throw new Error(
                `Order is not available for driver. Current status: ${order.status}`
            );
        }

        const deliveryStatus = "delivery_accepted";

        const updateData: any = {
            driver: driverId,
            deliveryStatus,
            driverAssignedAt: new Date(),
            deliveryAcceptedAt: new Date(),
            isLiveTrackingEnabled: true,
            $push: {
                trackingHistory: {
                    title: "Delivery accepted by rider",
                    status: deliveryStatus,
                    remark: "Rider accepted the delivery and can proceed to store.",
                    updatedBy: driverId,
                    updatedByRole: "driver",
                    updatedAt: new Date(),
                },
            },
        };

        const updatedOrder = await this.repo.takeOrder(
            orderId,
            driverId,
            updateData
        );

        if (!updatedOrder) {
            throw new Error("Order is already assigned or not available");
        }

        return updatedOrder;
    }

    async updateDeliveryStatus(
        orderId: any,
        driverId: string,
        deliveryStatus: string,
        options: {
            remark?: string;
            currentLocation?: {
                lat?: number;
                lng?: number;
                address?: string;
            };
        } = {}
    ) {
        if (!orderId) {
            throw new Error("orderId is required");
        }

        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        if (!deliveryStatus) {
            throw new Error("deliveryStatus is required");
        }

        const order = await this.repo.findDriverOrderById(orderId, driverId);

        if (!order) {
            throw new Error("Order not found for this driver");
        }

        const currentStatus = order.deliveryStatus || "not_assigned";
        const allowedStatuses = validDeliveryTransitions[currentStatus] || [];

        if (!allowedStatuses.includes(deliveryStatus)) {
            throw new Error(
                `Cannot change delivery status from ${currentStatus} to ${deliveryStatus}`
            );
        }

        if (
            deliveryStatus === "pickup_verification_pending" &&
            order.status !== "ready_for_pickup"
        ) {
            throw new Error(
                "Order is not ready for pickup yet. Rider should wait for packing."
            );
        }

        const isCustomVendor = order.vendorType === "custom";

        const finalDeliveryStatus =
            deliveryStatus === "reached_store"
                ? isCustomVendor
                    ? "reached_store"
                    : order.status === "ready_for_pickup"
                        ? "pickup_verification_pending"
                        : "waiting_for_packing"
                : deliveryStatus;

        const updateData: any = {
            deliveryStatus: finalDeliveryStatus,
            $push: {
                trackingHistory: {
                    title:
                        deliveryStatusTitleMap[finalDeliveryStatus] ||
                        "Delivery status updated",
                    status: finalDeliveryStatus,
                    remark:
                        options.remark ||
                        deliveryStatusTitleMap[finalDeliveryStatus] ||
                        "Delivery status updated.",
                    updatedBy: driverId,
                    updatedByRole: "driver",
                    updatedAt: new Date(),
                },
            },
        };

        if (options.currentLocation) {
            updateData.currentLocation = {
                lat: options.currentLocation.lat,
                lng: options.currentLocation.lng,
                address: options.currentLocation.address,
                updatedAt: new Date(),
            };
        }

        if (finalDeliveryStatus === "delivery_accepted") {
            updateData.deliveryAcceptedAt = new Date();
        }

        if (finalDeliveryStatus === "proceeding_to_store") {
            updateData.proceedingToStoreAt = new Date();
            updateData.isLiveTrackingEnabled = true;
        }

        if (deliveryStatus === "reached_store") {
            updateData.reachedStoreAt = new Date();

            if (finalDeliveryStatus === "waiting_for_packing") {
                updateData.waitingForPackingAt = new Date();
            }

            if (
                !isCustomVendor &&
                finalDeliveryStatus === "pickup_verification_pending"
            ) {
                updateData.pickupVerification = {
                    pickupOtp: generateOtp(),
                    pickupQrCode: generatePickupQrCode(String(orderId)),
                    otpVerified: false,
                    qrVerified: false,
                };
            }
        }

        if (finalDeliveryStatus === "waiting_for_packing") {
            updateData.waitingForPackingAt = new Date();
        }

        if (finalDeliveryStatus === "pickup_verification_pending") {
            const freshOrder = await this.repo.findDriverOrderById(
                orderId,
                driverId,
                true
            );

            const hasPickupOtp = Boolean(freshOrder?.pickupVerification?.pickupOtp);
            const hasPickupQr = Boolean(freshOrder?.pickupVerification?.pickupQrCode);

            if (!hasPickupOtp || !hasPickupQr) {
                updateData.pickupVerification = {
                    pickupOtp: generateOtp(),
                    pickupQrCode: generatePickupQrCode(String(orderId)),
                    otpVerified: false,
                    qrVerified: false,
                };
            }
        }

        if (finalDeliveryStatus === "picked_up") {
            updateData.pickedUpAt = new Date();
            updateData.status = "shipped";
            updateData.shippedAt = new Date();
            updateData.sellerStatus = "handed_to_rider";
            updateData.handedToRiderAt = new Date();
        }

        if (finalDeliveryStatus === "out_for_delivery") {
            updateData.outForDeliveryAt = new Date();
            updateData.status = "shipped";
            updateData.shippedAt = order.shippedAt || new Date();
        }

        if (finalDeliveryStatus === "reached_customer") {
            updateData.reachedCustomerAt = new Date();
        }

        if (finalDeliveryStatus === "customer_verification_pending") {
            updateData.customerVerification = {
                deliveryOtp: generateOtp(),
                otpVerified: false,
                signatureTaken: false,
            };
        }

        if (finalDeliveryStatus === "delivered") {
            throw new Error(
                "Use verifyCustomerDelivery API to complete delivery."
            );
        }

        if (finalDeliveryStatus === "failed") {
            updateData.failureReason = options.remark || "Delivery failed";
        }

        if (finalDeliveryStatus === "returned") {
            updateData.status = "returned";
            updateData.returnedAt = new Date();
            updateData.isLiveTrackingEnabled = false;
        }

        const updatedOrder = await this.repo.updateDeliveryStatus(
            orderId,
            driverId,
            updateData
        );

        if (!updatedOrder) {
            throw new Error("Order not found");
        }

        return updatedOrder;
    }

    async verifyPickup(
        orderId: any,
        driverId: string,
        payload: {
            pickupOtp?: string;
            pickupQrCode?: string;
        }
    ) {
        if (!orderId) {
            throw new Error("orderId is required");
        }

        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        const order = await this.repo.findDriverOrderById(
            orderId,
            driverId,
            true
        );

        if (!order) {
            throw new Error("Order not found for this driver");
        }

        if (order.status !== "ready_for_pickup") {
            throw new Error("Order is not ready for pickup");
        }

        if (order.deliveryStatus !== "pickup_verification_pending") {
            throw new Error(
                `Pickup verification is not allowed from ${order.deliveryStatus}`
            );
        }

        const existingPickupOtp = order.pickupVerification?.pickupOtp;
        const existingPickupQrCode = order.pickupVerification?.pickupQrCode;

        const isOtpValid =
            Boolean(payload.pickupOtp) &&
            Boolean(existingPickupOtp) &&
            payload.pickupOtp === existingPickupOtp;

        const isQrValid =
            Boolean(payload.pickupQrCode) &&
            Boolean(existingPickupQrCode) &&
            payload.pickupQrCode === existingPickupQrCode;

        if (!isOtpValid && !isQrValid) {
            throw new Error("Invalid pickup OTP or QR code");
        }

        const updateData: any = {
            deliveryStatus: "pickup_verified",
            "pickupVerification.otpVerified": Boolean(isOtpValid),
            "pickupVerification.qrVerified": Boolean(isQrValid),
            "pickupVerification.verifiedAt": new Date(),
            "pickupVerification.verifiedBy": driverId,
            $push: {
                trackingHistory: {
                    title: "Pickup verified",
                    status: "pickup_verified",
                    remark: "Rider pickup verified successfully.",
                    updatedBy: driverId,
                    updatedByRole: "driver",
                    updatedAt: new Date(),
                },
            },
        };

        const updatedOrder = await this.repo.updateDeliveryStatus(
            orderId,
            driverId,
            updateData
        );

        if (!updatedOrder) {
            throw new Error("Order not found");
        }

        return updatedOrder;
    }

    async verifyCustomerDelivery(
        orderId: any,
        driverId: string,
        payload: {
            deliveryOtp?: string;
            signatureUrl?: string;
        }
    ) {
        if (!orderId) {
            throw new Error("orderId is required");
        }

        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        const order = await this.repo.findDriverOrderById(
            orderId,
            driverId,
            true
        );

        if (!order) {
            throw new Error("Order not found for this driver");
        }

        if (order.deliveryStatus !== "customer_verification_pending") {
            throw new Error(
                `Customer verification is not allowed from ${order.deliveryStatus}`
            );
        }

        const existingDeliveryOtp = order.customerVerification?.deliveryOtp;

        const isOtpValid =
            Boolean(payload.deliveryOtp) &&
            Boolean(existingDeliveryOtp) &&
            payload.deliveryOtp === existingDeliveryOtp;

        const isSignatureValid = Boolean(payload.signatureUrl);

        if (!isOtpValid && !isSignatureValid) {
            throw new Error("Invalid customer OTP or signature is required");
        }

        const updateData: any = {
            status: "delivered",
            deliveryStatus: "delivered",
            deliveredAt: new Date(),
            isLiveTrackingEnabled: false,

            "customerVerification.otpVerified": Boolean(isOtpValid),
            "customerVerification.signatureTaken": Boolean(isSignatureValid),
            "customerVerification.signatureUrl": payload.signatureUrl || "",
            "customerVerification.verifiedAt": new Date(),
            "customerVerification.verifiedBy": driverId,

            $push: {
                trackingHistory: {
                    title: "Delivery completed",
                    status: "delivered",
                    remark: "Order delivered successfully.",
                    updatedBy: driverId,
                    updatedByRole: "driver",
                    updatedAt: new Date(),
                },
            },
        };

        const updatedOrder = await this.repo.updateDeliveryStatus(
            orderId,
            driverId,
            updateData
        );

        if (!updatedOrder) {
            throw new Error("Order not found");
        }

        return updatedOrder;
    }

    async getDriverOrders(
        driverId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        return await this.repo.findByDriver(
            driverId,
            this.normalizePage(page),
            this.normalizeLimit(limit),
            filter
        );
    }

    async getAvailableOrders(
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        return await this.repo.findAvailableOrders(
            this.normalizePage(page),
            this.normalizeLimit(limit),
            filter
        );
    }

    async getHistory(
        driverId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        return await this.repo.getHistory(
            driverId,
            this.normalizePage(page),
            this.normalizeLimit(limit),
            filter
        );
    }

    async getStats(driverId: string) {
        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        return await this.repo.getStats(driverId);
    }

    async partialPickupAndReassign(
        orderId: any,
        driverId: string,
        payload: {
            items: {
                product: string;
                variant?: string | null;
                pickedQuantity: number;
                shortQuantity: number;

                // SYSTEM VENDOR
                assignmentType?: "system" | "custom";
                vendorType?: "system" | "custom";
                newVendor?: string;
                newProduct?: string | null;
                newVariant?: string | null;

                // CUSTOM / OUTSIDE VENDOR
                customVendor?: {
                    externalVendorId?: string;
                    name?: string;
                    phone?: string;
                    address?: string;
                    latitude?: number | null;
                    longitude?: number | null;
                    notes?: string;
                };
                procurementPrice?: number | null;
            }[];
            remark?: string;
        }
    ) {
        if (!orderId) {
            throw new Error("orderId is required");
        }

        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        if (!Array.isArray(payload.items) || payload.items.length === 0) {
            throw new Error("Items are required");
        }

        const currentOrder: any = await this.repo.findDriverOrderById(
            orderId,
            driverId,
            true
        );

        if (!currentOrder) {
            throw new Error("Order not found for this driver");
        }

        if (currentOrder.vendorType === "custom") {
            throw new Error(
                "Custom vendor orders cannot be reassigned again from this flow"
            );
        }

        if (
            ![
                "reached_store",
                "waiting_for_packing",
                "pickup_verification_pending",
                "pickup_verified",
                "picked_up",
            ].includes(currentOrder.deliveryStatus)
        ) {
            throw new Error(
                `Partial pickup is not allowed from ${currentOrder.deliveryStatus}`
            );
        }

        const parentOrder: any = await OrderModel.findById(
            currentOrder.parentOrder
        );

        if (!parentOrder) {
            throw new Error("Parent order not found");
        }

        const now = new Date();

        const existingVendorOrderCount =
            await OrderVendorModel.countDocuments({
                parentOrder: currentOrder.parentOrder,
            });

        const currentItems = Array.isArray(currentOrder.items)
            ? currentOrder.items.map((item: any) =>
                typeof item.toObject === "function"
                    ? item.toObject()
                    : { ...item }
            )
            : [];

        const pickedItems: any[] = [];

        type ShortageGroup = {
            vendorType: "system" | "custom";

            /**
             * exactOptionalPropertyTypes is enabled.
             *
             * These properties are explicitly assigned `undefined` below
             * depending on whether the shortage is going to a system vendor
             * or a custom/outside vendor, so `undefined` must be part of the
             * property type.
             */
            vendorId?: string | undefined;
            customVendor?: any | undefined;

            items: any[];
        };

        const shortageGroups = new Map<string, ShortageGroup>();

        const buildExternalVendorId = () =>
            `EXTV-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)
                .toUpperCase()}`;

        for (const currentItem of currentItems) {
            const currentProductId = String(
                currentItem.product?._id || currentItem.product || ""
            );

            const currentVariantId = currentItem.variant
                ? String(currentItem.variant?._id || currentItem.variant)
                : "";

            const inputItem = payload.items.find((item) => {
                const inputProductId = String(item.product || "");
                const inputVariantId = item.variant
                    ? String(item.variant)
                    : "";

                return (
                    inputProductId === currentProductId &&
                    inputVariantId === currentVariantId
                );
            });

            if (!inputItem) {
                pickedItems.push(currentItem);
                continue;
            }

            const originalQuantity = Number(currentItem.quantity || 0);
            const pickedQuantity = Number(inputItem.pickedQuantity || 0);
            const shortQuantity = Number(inputItem.shortQuantity || 0);

            if (pickedQuantity < 0 || shortQuantity < 0) {
                throw new Error(
                    "Picked quantity and short quantity cannot be negative"
                );
            }

            if (pickedQuantity + shortQuantity !== originalQuantity) {
                throw new Error(
                    `${currentItem.name}: pickedQuantity + shortQuantity must match ordered quantity`
                );
            }

            const assignmentType: "system" | "custom" =
                inputItem.assignmentType === "custom" ||
                    inputItem.vendorType === "custom"
                    ? "custom"
                    : "system";

            let customVendorSnapshot: any = null;
            let targetGroupKey = "";

            if (shortQuantity > 0) {
                if (assignmentType === "system") {
                    if (!inputItem.newVendor) {
                        throw new Error(
                            `${currentItem.name}: newVendor is required for system vendor reassignment`
                        );
                    }

                    if (
                        String(inputItem.newVendor) ===
                        String(currentOrder.vendor)
                    ) {
                        throw new Error(
                            "New vendor must be different from current vendor"
                        );
                    }

                    targetGroupKey = `system:${String(
                        inputItem.newVendor
                    )}`;
                } else {
                    const customVendor = inputItem.customVendor || {};
                    const name = String(customVendor.name || "").trim();
                    const phone = String(customVendor.phone || "").trim();
                    const address = String(customVendor.address || "").trim();

                    if (!name) {
                        throw new Error("Outside vendor name is required");
                    }

                    if (!phone) {
                        throw new Error("Outside vendor phone is required");
                    }

                    if (!address) {
                        throw new Error("Outside vendor address is required");
                    }

                    const externalVendorId =
                        String(customVendor.externalVendorId || "").trim() ||
                        buildExternalVendorId();

                    const rawLatitude: any = customVendor.latitude;
                    const rawLongitude: any = customVendor.longitude;

                    customVendorSnapshot = {
                        externalVendorId,
                        name,
                        phone,
                        address,
                        latitude:
                            rawLatitude === null ||
                                rawLatitude === undefined ||
                                rawLatitude === ""
                                ? null
                                : Number(rawLatitude),
                        longitude:
                            rawLongitude === null ||
                                rawLongitude === undefined ||
                                rawLongitude === ""
                                ? null
                                : Number(rawLongitude),
                        notes: String(customVendor.notes || "").trim(),
                    };

                    targetGroupKey = `custom:${externalVendorId}`;
                }
            }

            if (pickedQuantity > 0) {
                pickedItems.push({
                    ...currentItem,
                    quantity: pickedQuantity,
                    total:
                        Math.round(
                            Number(currentItem.price || 0) *
                            pickedQuantity *
                            100
                        ) / 100,
                });
            }

            if (shortQuantity > 0) {
                const targetProduct =
                    assignmentType === "system"
                        ? inputItem.newProduct || currentProductId
                        : currentProductId;

                const targetVariant =
                    assignmentType === "system"
                        ? inputItem.newVariant ?? currentItem.variant ?? null
                        : currentItem.variant || null;

                if (!shortageGroups.has(targetGroupKey)) {
                    shortageGroups.set(targetGroupKey, {
                        vendorType: assignmentType,
                        vendorId:
                            assignmentType === "system"
                                ? String(inputItem.newVendor)
                                : undefined,
                        customVendor:
                            assignmentType === "custom"
                                ? customVendorSnapshot
                                : undefined,
                        items: [],
                    });
                }

                shortageGroups.get(targetGroupKey)!.items.push({
                    product: targetProduct,
                    variant: targetVariant,
                    name: currentItem.name,
                    sku: currentItem.sku,
                    price: currentItem.price,
                    mrp: currentItem.mrp,
                    procurementPrice:
                        inputItem.procurementPrice === null ||
                            inputItem.procurementPrice === undefined
                            ? null
                            : Number(inputItem.procurementPrice),
                    quantity: shortQuantity,
                    images: currentItem.images || [],
                    total:
                        Math.round(
                            Number(currentItem.price || 0) *
                            shortQuantity *
                            100
                        ) / 100,
                });
            }
        }

        if (shortageGroups.size === 0) {
            throw new Error("No shortage quantity found for reassignment");
        }

        const pickedSubtotal =
            Math.round(
                pickedItems.reduce(
                    (sum: number, item: any) =>
                        sum + Number(item.total || 0),
                    0
                ) * 100
            ) / 100;

        const currentOrderUpdateData: any = {
            discount: 0,
            gstAmount: 0,
            shippingCharge: 0,
            $push: {
                trackingHistory: {
                    title: "Partial pickup completed",
                    status:
                        pickedItems.length > 0
                            ? "picked_up"
                            : "cancelled",
                    remark:
                        payload.remark ||
                        "Rider picked available quantity and reassigned the shortage.",
                    updatedBy: driverId,
                    updatedByRole: "driver",
                    updatedAt: now,
                },
            },
        };

        if (pickedItems.length > 0) {
            currentOrderUpdateData.items = pickedItems;
            currentOrderUpdateData.subtotal = pickedSubtotal;
            currentOrderUpdateData.totalAmount = pickedSubtotal;
            currentOrderUpdateData.status = "shipped";
            currentOrderUpdateData.deliveryStatus = "picked_up";
            currentOrderUpdateData.sellerStatus = "handed_to_rider";
            currentOrderUpdateData.pickedUpAt = now;
            currentOrderUpdateData.shippedAt = now;
            currentOrderUpdateData.handedToRiderAt = now;
        } else {
            currentOrderUpdateData.status = "cancelled";
            currentOrderUpdateData.sellerStatus = "cancelled";
            currentOrderUpdateData.deliveryStatus = "failed";
            currentOrderUpdateData.cancelledAt = now;
            currentOrderUpdateData.failureReason =
                payload.remark ||
                "Seller does not have available quantity.";
        }

        const updatedCurrentOrder =
            await this.repo.updateDeliveryStatus(
                orderId,
                driverId,
                currentOrderUpdateData
            );

        const createdVendorOrders: any[] = [];
        let newIndex = existingVendorOrderCount + 1;

        for (const group of shortageGroups.values()) {
            const shortageSubtotal =
                Math.round(
                    group.items.reduce(
                        (sum: number, item: any) =>
                            sum + Number(item.total || 0),
                        0
                    ) * 100
                ) / 100;

            const vendorOrderNumber =
                `${currentOrder.orderNumber}-V${newIndex}`;

            const deliveryOtp = generateOtp();
            const isCustom = group.vendorType === "custom";

            const newVendorOrderData: any = {
                parentOrder: currentOrder.parentOrder,
                user: currentOrder.user,
                vendorType: group.vendorType,
                vendor: isCustom ? undefined : group.vendorId,
                customVendor: isCustom ? group.customVendor : undefined,
                driver: isCustom ? driverId : undefined,
                orderNumber: currentOrder.orderNumber,
                vendorOrderNumber,
                items: group.items,
                billingAddress: currentOrder.billingAddress,
                shippingAddress: currentOrder.shippingAddress,
                paymentMethod: currentOrder.paymentMethod,
                paymentTransaction: currentOrder.paymentTransaction,
                subtotal: shortageSubtotal,
                discount: 0,
                gstAmount: 0,
                shippingCharge: 0,
                totalAmount: shortageSubtotal,
                paymentStatus: currentOrder.paymentStatus,
                paymentMode: currentOrder.paymentMode,

                // Outside vendors have no seller app/account, so the same
                // driver can immediately start travelling to that shop.
                status: isCustom ? "ready_for_pickup" : "placed",
                sellerStatus: isCustom
                    ? "ready_for_pickup"
                    : "pending_acceptance",
                deliveryStatus: isCustom
                    ? "delivery_accepted"
                    : "not_assigned",
                sellerAcceptedAt: isCustom ? now : undefined,
                readyForPickupAt: isCustom ? now : undefined,
                driverAssignedAt: isCustom ? now : undefined,
                deliveryAcceptedAt: isCustom ? now : undefined,
                isLiveTrackingEnabled: isCustom,

                pickupVerification: isCustom
                    ? {
                        otpVerified: false,
                        qrVerified: false,
                    }
                    : {
                        pickupOtp: generateOtp(),
                        pickupQrCode:
                            generatePickupQrCode(vendorOrderNumber),
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
                        title: isCustom
                            ? "Outside vendor assigned"
                            : "Order reassigned to new seller",
                        status: isCustom
                            ? "delivery_accepted"
                            : "placed",
                        remark:
                            payload.remark ||
                            (isCustom
                                ? `Shortage assigned to outside vendor ${group.customVendor?.name || ""}.`
                                : "Shortage quantity reassigned from previous seller."),
                        updatedBy: driverId,
                        updatedByRole: "driver",
                        updatedAt: now,
                    },
                ],
                isActive: true,
            };

            const newVendorOrder =
                await OrderVendorModel.create(newVendorOrderData);

            createdVendorOrders.push(newVendorOrder);
            newIndex++;
        }

        // Rebuild parent items so the parent order keeps a complete
        // audit snapshot of where every quantity is being sourced.
        const parentItems: any[] = [];

        for (const parentItem of parentOrder.items || []) {
            const plainParentItem =
                typeof parentItem.toObject === "function"
                    ? parentItem.toObject()
                    : { ...parentItem };

            const parentProductId = String(
                plainParentItem.product?._id ||
                plainParentItem.product ||
                ""
            );

            const parentVariantId = plainParentItem.variant
                ? String(
                    plainParentItem.variant?._id ||
                    plainParentItem.variant
                )
                : "";

            const splitInput = payload.items.find((item) => {
                const inputProductId = String(item.product || "");
                const inputVariantId = item.variant
                    ? String(item.variant)
                    : "";

                return (
                    inputProductId === parentProductId &&
                    inputVariantId === parentVariantId &&
                    String(plainParentItem.vendor || "") ===
                    String(currentOrder.vendor || "")
                );
            });

            if (!splitInput) {
                parentItems.push(plainParentItem);
                continue;
            }

            const pickedQuantity = Number(
                splitInput.pickedQuantity || 0
            );
            const shortQuantity = Number(
                splitInput.shortQuantity || 0
            );
            const assignmentType: "system" | "custom" =
                splitInput.assignmentType === "custom" ||
                    splitInput.vendorType === "custom"
                    ? "custom"
                    : "system";

            if (pickedQuantity > 0) {
                parentItems.push({
                    ...plainParentItem,
                    vendorType: "system",
                    customVendor: undefined,
                    quantity: pickedQuantity,
                    total:
                        Math.round(
                            Number(plainParentItem.price || 0) *
                            pickedQuantity *
                            100
                        ) / 100,
                });
            }

            if (shortQuantity > 0) {
                if (assignmentType === "custom") {
                    const matchingGroup = Array.from(
                        shortageGroups.values()
                    ).find((group) =>
                        group.vendorType === "custom" &&
                        group.items.some(
                            (groupItem: any) =>
                                String(groupItem.name) ===
                                String(plainParentItem.name)
                        )
                    );

                    parentItems.push({
                        ...plainParentItem,
                        vendorType: "custom",
                        vendor: undefined,
                        customVendor: matchingGroup?.customVendor,
                        procurementPrice:
                            splitInput.procurementPrice ?? null,
                        quantity: shortQuantity,
                        total:
                            Math.round(
                                Number(plainParentItem.price || 0) *
                                shortQuantity *
                                100
                            ) / 100,
                    });
                } else {
                    parentItems.push({
                        ...plainParentItem,
                        vendorType: "system",
                        vendor: splitInput.newVendor,
                        customVendor: undefined,
                        product:
                            splitInput.newProduct ||
                            plainParentItem.product,
                        variant:
                            splitInput.newVariant ??
                            plainParentItem.variant ??
                            null,
                        procurementPrice:
                            splitInput.procurementPrice ?? null,
                        quantity: shortQuantity,
                        total:
                            Math.round(
                                Number(plainParentItem.price || 0) *
                                shortQuantity *
                                100
                            ) / 100,
                    });
                }
            }
        }

        const systemVendorIds = [
            ...new Set(
                parentItems
                    .filter(
                        (item: any) =>
                            item.vendorType !== "custom"
                    )
                    .map((item: any) =>
                        String(item.vendor || "")
                    )
                    .filter(Boolean)
            ),
        ];

        const customVendorIds = [
            ...new Set(
                parentItems
                    .filter(
                        (item: any) =>
                            item.vendorType === "custom"
                    )
                    .map(
                        (item: any) =>
                            item.customVendor?.externalVendorId
                    )
                    .filter(Boolean)
            ),
        ];

        const parentSubtotal =
            Math.round(
                parentItems.reduce(
                    (sum: number, item: any) =>
                        sum + Number(item.total || 0),
                    0
                ) * 100
            ) / 100;

        parentOrder.items = parentItems;
        parentOrder.vendors = systemVendorIds;
        parentOrder.vendorOrderCount =
            systemVendorIds.length + customVendorIds.length;
        parentOrder.orderType =
            parentOrder.vendorOrderCount > 1
                ? "multi_vendor"
                : "single_vendor";
        parentOrder.vendor =
            systemVendorIds.length === 1 && customVendorIds.length === 0
                ? systemVendorIds[0]
                : undefined;
        parentOrder.subtotal = parentSubtotal;
        parentOrder.totalAmount =
            parentSubtotal -
            Number(parentOrder.discount || 0) +
            Number(parentOrder.shippingCharge || 0) +
            Number(parentOrder.gstAmount || 0);
        parentOrder.status = "partially_shipped";

        parentOrder.trackingHistory.push({
            title: "Order partially fulfilled",
            status: "partially_shipped",
            remark:
                payload.remark ||
                "Available quantity picked and shortage assigned to another source.",
            updatedBy: driverId,
            updatedByRole: "driver",
            updatedAt: now,
        });

        await parentOrder.save();

        return {
            currentVendorOrder: updatedCurrentOrder,
            reassignedVendorOrders: createdVendorOrders,
            parentOrder,
        };
    }

    async getReassignVendors(
        orderId: any,
        driverId: string,
        payload: {
            product: string;
            variant?: string | null;
            shortQuantity: number;
        }
    ) {
        if (!orderId) {
            throw new Error("orderId is required");
        }

        if (!driverId) {
            throw new Error("Driver Id is required");
        }

        if (!payload.product) {
            throw new Error("product is required");
        }

        if (!payload.shortQuantity || Number(payload.shortQuantity) <= 0) {
            throw new Error("shortQuantity must be greater than 0");
        }

        const currentOrder: any = await this.repo.findDriverOrderById(
            orderId,
            driverId,
            true
        );

        if (!currentOrder) {
            throw new Error("Order not found for this driver");
        }

        if (
            ![
                "reached_store",
                "waiting_for_packing",
                "pickup_verification_pending",
                "pickup_verified",
                "picked_up",
            ].includes(currentOrder.deliveryStatus)
        ) {
            throw new Error(
                `Vendor listing is not allowed from ${currentOrder.deliveryStatus}`
            );
        }

        const currentItems = Array.isArray(currentOrder.items)
            ? currentOrder.items
            : [];

        const itemExistsInOrder = currentItems.some((item: any) => {
            const itemProductId = String(item.product?._id || item.product || "");
            const itemVariantId = item.variant
                ? String(item.variant?._id || item.variant)
                : "";

            const inputProductId = String(payload.product || "");
            const inputVariantId = payload.variant ? String(payload.variant) : "";

            return itemProductId === inputProductId && itemVariantId === inputVariantId;
        });

        if (!itemExistsInOrder) {
            throw new Error("Product item not found in this vendor order");
        }

        const currentVendorId = String(
            currentOrder.vendor?._id ||
            currentOrder.vendor?.id ||
            currentOrder.vendor ||
            ""
        );

        const [variantDetails, vendors] = await Promise.all([
            this.repo.findProductVariantDetails(
                payload.product,
                payload.variant || null
            ),
            this.repo.findReassignVendorsForItem({
                productId: payload.product,
                variantId: payload.variant || null,
                currentVendorId,
                requiredQuantity: Number(payload.shortQuantity),
            }),
        ]);

        return {
            product: payload.product,

            // Existing id is kept for backward compatibility.
            variant: payload.variant || null,

            // Exact selected product variant resolved from Product.variants.
            variantDetails,

            shortQuantity: Number(payload.shortQuantity),
            currentVendor: currentVendorId,
            vendors,

            // Frontend can show the outside-vendor form when no system
            // vendor has enough stock. It can also expose it manually.
            customVendorAllowed: true,
            hasSystemVendorWithRequiredQty: vendors.length > 0,
        };
    }
}