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

        const finalDeliveryStatus =
            deliveryStatus === "reached_store"
                ? order.status === "ready_for_pickup"
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

            if (finalDeliveryStatus === "pickup_verification_pending") {
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
                newVendor: string;
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
            ? currentOrder.items.map((item: any) => {
                const plainItem =
                    typeof item.toObject === "function"
                        ? item.toObject()
                        : { ...item };

                return plainItem;
            })
            : [];

        const pickedItems: any[] = [];
        const shortageGroups = new Map<string, any[]>();

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

            // If driver didn't send this item, keep it unchanged.
            if (!inputItem) {
                pickedItems.push(currentItem);
                continue;
            }

            console.log("Processing input item:", inputItem);

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

            // Only require/validate newVendor when there is a shortage.
            if (shortQuantity > 0) {
                if (!inputItem.newVendor) {
                    throw new Error(
                        `${currentItem.name}: newVendor is required for short quantity`
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
            }

            // ---------------------------------------------------------
            // CASE 1:
            // Driver picked some quantity from current seller.
            // ---------------------------------------------------------
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

            // ---------------------------------------------------------
            // CASE 2:
            // Driver picked 0 OR partial quantity.
            // Shortage goes to new seller.
            // ---------------------------------------------------------
            if (shortQuantity > 0) {
                const vendorId = String(inputItem.newVendor);

                if (!shortageGroups.has(vendorId)) {
                    shortageGroups.set(vendorId, []);
                }

                shortageGroups.get(vendorId)!.push({
                    product:
                        currentItem.product?._id ||
                        currentItem.product,
                    variant: currentItem.variant || null,
                    name: currentItem.name,
                    sku: currentItem.sku,
                    price: currentItem.price,
                    mrp: currentItem.mrp,
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

        // There must be at least one shortage to create a reassignment.
        if (shortageGroups.size === 0) {
            throw new Error(
                "No shortage quantity found for reassignment"
            );
        }

        const pickedSubtotal =
            Math.round(
                pickedItems.reduce((sum: number, item: any) => {
                    return sum + Number(item.total || 0);
                }, 0) * 100
            ) / 100;

        console.log("pickedItems:", pickedItems);
        console.log("shortageGroups:", shortageGroups);

        // ---------------------------------------------------------
        // CURRENT VENDOR ORDER UPDATE
        // ---------------------------------------------------------
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
                        "Rider picked available quantity and reassigned shortage quantity to another seller.",
                    updatedBy: driverId,
                    updatedByRole: "driver",
                    updatedAt: now,
                },
            },
        };

        // ---------------------------------------------------------
        // IMPORTANT:
        // Only set items/subtotal/totalAmount when current vendor
        // still has at least one picked item.
        //
        // If pickedItems = [], we DON'T send items: [] because
        // orderVendorItemSchema requires at least one item.
        // ---------------------------------------------------------
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
            // -----------------------------------------------------
            // Seller has ZERO quantity.
            //
            // Do NOT update items to [].
            // Just cancel/fail the current vendor order.
            // -----------------------------------------------------
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

        // ---------------------------------------------------------
        // CREATE NEW VENDOR ORDERS FOR SHORTAGE
        // ---------------------------------------------------------
        const createdVendorOrders: any[] = [];
        let newIndex = existingVendorOrderCount + 1;

        for (const [
            newVendorId,
            shortageItems,
        ] of shortageGroups.entries()) {
            const shortageSubtotal =
                Math.round(
                    shortageItems.reduce(
                        (sum: number, item: any) => {
                            return sum + Number(item.total || 0);
                        },
                        0
                    ) * 100
                ) / 100;

            const vendorOrderNumber = `${currentOrder.orderNumber}-V${newIndex}`;

            const pickupOtp = generateOtp();
            const deliveryOtp = generateOtp();

            const pickupQrCode =
                generatePickupQrCode(vendorOrderNumber);

            const newVendorOrder =
                await OrderVendorModel.create({
                    parentOrder: currentOrder.parentOrder,

                    user: currentOrder.user,

                    vendor: newVendorId,

                    orderNumber: currentOrder.orderNumber,

                    vendorOrderNumber,

                    items: shortageItems,

                    billingAddress: currentOrder.billingAddress,

                    shippingAddress: currentOrder.shippingAddress,

                    paymentMethod: currentOrder.paymentMethod,

                    paymentTransaction:
                        currentOrder.paymentTransaction,

                    subtotal: shortageSubtotal,

                    discount: 0,

                    gstAmount: 0,

                    shippingCharge: 0,

                    totalAmount: shortageSubtotal,

                    paymentStatus: currentOrder.paymentStatus,

                    paymentMode: currentOrder.paymentMode,

                    status: "placed",

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
                            title: "Order reassigned to new seller",

                            status: "placed",

                            remark:
                                payload.remark ||
                                "Shortage quantity reassigned from previous seller.",

                            updatedBy: driverId,

                            updatedByRole: "driver",

                            updatedAt: now,
                        },
                    ],

                    isActive: true,
                });

            createdVendorOrders.push(newVendorOrder);

            newIndex++;
        }

        // ---------------------------------------------------------
        // UPDATE PARENT ORDER
        // ---------------------------------------------------------
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
                    String(plainParentItem.vendor) ===
                    String(currentOrder.vendor)
                );
            });

            // Item was not part of reassignment.
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

            // Current vendor gets picked quantity.
            if (pickedQuantity > 0) {
                parentItems.push({
                    ...plainParentItem,

                    quantity: pickedQuantity,

                    total:
                        Math.round(
                            Number(plainParentItem.price || 0) *
                            pickedQuantity *
                            100
                        ) / 100,
                });
            }

            // New vendor gets shortage quantity.
            if (shortQuantity > 0) {
                parentItems.push({
                    ...plainParentItem,

                    vendor: splitInput.newVendor,

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

        const vendorIds = [
            ...new Set(
                parentItems
                    .map((item: any) =>
                        String(item.vendor || "")
                    )
                    .filter(Boolean)
            ),
        ];

        const parentSubtotal =
            Math.round(
                parentItems.reduce(
                    (sum: number, item: any) => {
                        return sum + Number(item.total || 0);
                    },
                    0
                ) * 100
            ) / 100;

        parentOrder.items = parentItems;
        parentOrder.vendors = vendorIds;
        parentOrder.vendorOrderCount = vendorIds.length;
        parentOrder.orderType =
            vendorIds.length > 1
                ? "multi_vendor"
                : "single_vendor";
        parentOrder.vendor =
            vendorIds.length === 1
                ? vendorIds[0]
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
                "Available quantity picked from current seller and shortage quantity assigned to another seller.",
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

        const vendors = await this.repo.findReassignVendorsForItem({
            productId: payload.product,
            variantId: payload.variant || null,
            currentVendorId,
            requiredQuantity: Number(payload.shortQuantity),
        });

        return {
            product: payload.product,
            variant: payload.variant || null,
            shortQuantity: Number(payload.shortQuantity),
            currentVendor: currentVendorId,
            vendors,
        };
    }
}