import { VendorOrderRepository } from "../repository/vendororders.repository.js";
import { FirebaseTokenService } from "../../notification/services/firebasetoken.service.js";
import { DriverProfileModel } from "../../driverprofile/models/driverprofile.model.js";
import { OrderWhatsAppService } from "./orderwhatsapp.service.js";

const generateOtp = () => {
    return Math.floor(
        100000 + Math.random() * 900000,
    ).toString();
};

const generatePickupQrCode = (
    orderNumber: string,
    vendorOrderNumber: string,
) => {
    return `PICKUP-${orderNumber}-${vendorOrderNumber}-${Date.now()}-${Math.floor(
        1000 + Math.random() * 9000,
    )}`;
};


const vendorValidTransitions:
    Record<string, string[]> = {

    pending: [
        "placed",
        "cancelled",
    ],

    placed: [
        "seller_accepted",
        "cancelled",
    ],

    seller_accepted: [
        "picking_products",
        "packing_order",
        "ready_for_pickup",
        "cancelled",
    ],

    picking_products: [
        "packing_order",
        "ready_for_pickup",
        "cancelled",
    ],

    packing_order: [
        "ready_for_pickup",
        "cancelled",
    ],

    ready_for_pickup: [],

    shipped: [],

    delivered: [],

    cancelled: [],

    returned: [],
};


const sellerStatusMap:
    Record<string, string> = {

    pending:
        "pending_acceptance",

    placed:
        "pending_acceptance",

    seller_accepted:
        "accepted",

    picking_products:
        "picking_products",

    packing_order:
        "packing_order",

    ready_for_pickup:
        "ready_for_pickup",

    cancelled:
        "cancelled",
};


const vendorStatusTitleMap:
    Record<string, string> = {

    placed:
        "Vendor order placed",

    seller_accepted:
        "Order accepted by seller",

    picking_products:
        "Seller started picking products",

    packing_order:
        "Seller started packing order",

    ready_for_pickup:
        "Order ready for pickup",

    cancelled:
        "Order cancelled by seller",
};


const driverPushTitleMap:
    Record<string, string> = {

    seller_accepted:
        "New delivery order available",

    picking_products:
        "Seller started picking products",

    packing_order:
        "Seller started packing order",

    ready_for_pickup:
        "Order ready for pickup",

    cancelled:
        "Vendor order cancelled",
};


export class VendorOrderService {

    private repo =
        new VendorOrderRepository();

    private firebaseTokenService =
        new FirebaseTokenService();

    private orderWhatsAppService =
        new OrderWhatsAppService();


    async getVendorOrders(
        vendorId: string,
        page = 1,
        limit = 10,
        filter: any = {},
    ) {
        if (!vendorId) {
            throw new Error(
                "vendorId is required",
            );
        }

        return await this.repo.findByVendor(
            vendorId,
            page,
            limit,
            filter,
        );
    }


    async getVendorPickupOtp(
        orderId: any,
        vendorId: string,
    ) {
        if (!orderId) {
            throw new Error(
                "orderId is required",
            );
        }

        if (!vendorId) {
            throw new Error(
                "vendorId is required",
            );
        }

        let order: any =
            await this.repo
                .findVendorOrderWithPickupOtp(
                    orderId,
                    vendorId,
                );

        if (!order) {
            throw new Error(
                "Vendor order not found",
            );
        }

        const allowedStatuses = [
            "ready_for_pickup",
            "shipped",
            "delivered",
        ];

        const allowedDeliveryStatuses = [
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
        ];

        const canShowOtp =
            allowedStatuses.includes(
                order.status,
            )
            ||
            allowedDeliveryStatuses.includes(
                order.deliveryStatus,
            );

        if (!canShowOtp) {
            throw new Error(
                "Pickup OTP is available after order is ready for pickup",
            );
        }

        let pickupOtp =
            order
                .pickupVerification
                ?.pickupOtp;

        let pickupQrCode =
            order
                .pickupVerification
                ?.pickupQrCode;

        if (
            !pickupOtp ||
            !pickupQrCode
        ) {
            pickupOtp =
                generateOtp();

            pickupQrCode =
                generatePickupQrCode(
                    order.orderNumber,
                    order.vendorOrderNumber,
                );

            order =
                await this.repo
                    .updateVendorPickupOtp(
                        order._id,
                        pickupOtp,
                        pickupQrCode,
                    );
        }

        return {
            orderId:
                order._id,

            parentOrder:
                order.parentOrder,

            orderNumber:
                order.orderNumber,

            vendorOrderNumber:
                order.vendorOrderNumber,

            status:
                order.status,

            sellerStatus:
                order.sellerStatus,

            deliveryStatus:
                order.deliveryStatus,

            pickupVerification: {
                pickupOtp,

                pickupQrCode,

                otpVerified:
                    order
                        .pickupVerification
                        ?.otpVerified
                    || false,

                qrVerified:
                    order
                        .pickupVerification
                        ?.qrVerified
                    || false,
            },
        };
    }


    async updateOrderStatus(
        orderId: any,
        vendorId: string,
        status: string,
        remark?: string,
    ) {
        if (!orderId) {
            throw new Error(
                "orderId is required",
            );
        }

        if (!vendorId) {
            throw new Error(
                "vendorId is required",
            );
        }

        if (!status) {
            throw new Error(
                "status is required",
            );
        }

        const order: any =
            await this.repo
                .findVendorOrderById(
                    orderId,
                    vendorId,
                );

        if (!order) {
            throw new Error(
                "Vendor order not found",
            );
        }

        const currentStatus =
            order.status;

        const allowedStatuses =
            vendorValidTransitions[
            currentStatus
            ]
            || [];

        if (
            !allowedStatuses.includes(
                status,
            )
        ) {
            throw new Error(
                `Cannot change status from ${currentStatus} to ${status}`,
            );
        }

        const now =
            new Date();

        const setData: any = {
            status,

            sellerStatus:
                sellerStatusMap[
                status
                ],
        };


        if (
            status ===
            "seller_accepted"
        ) {
            setData.sellerAcceptedAt =
                now;

            if (
                !order
                    .sellerAcceptDeadlineAt
            ) {
                setData.sellerAcceptDeadlineAt =
                    new Date(
                        order.createdAt
                            ? new Date(
                                order.createdAt,
                            ).getTime()
                            + 5 * 60 * 1000
                            : Date.now()
                            + 5 * 60 * 1000,
                    );
            }
        }


        if (
            status ===
            "picking_products"
        ) {
            setData.pickingStartedAt =
                now;
        }


        if (
            status ===
            "packing_order"
        ) {
            setData.packingStartedAt =
                now;

            if (
                order.deliveryStatus ===
                "assigned"
                ||
                order.deliveryStatus ===
                "delivery_accepted"
                ||
                order.deliveryStatus ===
                "proceeding_to_store"
                ||
                order.deliveryStatus ===
                "reached_store"
            ) {
                setData.deliveryStatus =
                    "waiting_for_packing";

                setData.waitingForPackingAt =
                    now;
            }
        }


        if (
            status ===
            "ready_for_pickup"
        ) {
            setData.readyForPickupAt =
                now;

            if (
                !order
                    .pickupVerification
                    ?.pickupOtp
            ) {
                setData[
                    "pickupVerification.pickupOtp"
                ] =
                    generateOtp();
            }

            if (
                !order
                    .pickupVerification
                    ?.pickupQrCode
            ) {
                setData[
                    "pickupVerification.pickupQrCode"
                ] =
                    generatePickupQrCode(
                        order.orderNumber,
                        order.vendorOrderNumber,
                    );
            }

            setData[
                "pickupVerification.otpVerified"
            ] =
                false;

            setData[
                "pickupVerification.qrVerified"
            ] =
                false;

            if (
                order.deliveryStatus
                &&
                order.deliveryStatus !==
                "not_assigned"
                &&
                order.deliveryStatus !==
                "picked_up"
                &&
                order.deliveryStatus !==
                "out_for_delivery"
                &&
                order.deliveryStatus !==
                "delivered"
            ) {
                setData.deliveryStatus =
                    "pickup_verification_pending";
            }
        }


        if (
            status ===
            "cancelled"
        ) {
            setData.cancelledAt =
                now;

            setData.cancellationReason =
                remark
                || "Cancelled by seller";
        }


        const updateData: any = {
            $set:
                setData,

            $push: {
                trackingHistory: {
                    title:
                        vendorStatusTitleMap[
                        status
                        ]
                        ||
                        "Vendor order status updated",

                    status,

                    remark:
                        remark
                        ||
                        vendorStatusTitleMap[
                        status
                        ]
                        ||
                        "Vendor order status updated",

                    updatedBy:
                        vendorId,

                    updatedByRole:
                        "vendor",

                    updatedAt:
                        now,
                },
            },
        };


        const updatedOrder: any =
            await this.repo
                .updateOrderStatus(
                    orderId,
                    vendorId,
                    updateData,
                );

        if (!updatedOrder) {
            throw new Error(
                "Vendor order not found",
            );
        }


        /**
         * Keep existing parent-order
         * synchronization flow.
         */
        await this.syncParentOrderStatus(
            updatedOrder.parentOrder,
        );


        /**
         * Keep existing Firebase
         * notification flow.
         */
        await this
            .sendDriverPushForVendorStatus({
                updatedOrder,

                previousOrder:
                    order,

                status,

                ...(remark !== undefined
                    ? {
                        remark,
                    }
                    : {}),
            });


        /**
         * Customer WhatsApp.
         *
         * Only SELLER_ACCEPTED is emitted
         * from VendorOrderService.
         *
         * WhatsApp failures are handled
         * internally and never fail the
         * order update.
         */
        await this
            .sendCustomerWhatsAppForVendorStatus({
                updatedOrder,

                previousOrder:
                    order,

                status,
            });


        return updatedOrder;
    }


    private async syncParentOrderStatus(
        parentOrderId: any,
    ) {
        if (!parentOrderId) {
            return;
        }

        const vendorOrders =
            await this.repo
                .findActiveVendorOrdersByParentOrder(
                    parentOrderId,
                );

        if (
            !vendorOrders ||
            vendorOrders.length === 0
        ) {
            return;
        }

        const statuses =
            vendorOrders.map(
                (item: any) =>
                    item.status,
            );

        let parentStatus =
            "placed";


        const allCancelled =
            statuses.every(
                (status: string) =>
                    status ===
                    "cancelled",
            );

        const someCancelled =
            statuses.some(
                (status: string) =>
                    status ===
                    "cancelled",
            );


        const allDelivered =
            statuses.every(
                (status: string) =>
                    status ===
                    "delivered",
            );

        const someDelivered =
            statuses.some(
                (status: string) =>
                    status ===
                    "delivered",
            );


        const allShipped =
            statuses.every(
                (status: string) =>
                    [
                        "shipped",
                        "delivered",
                    ].includes(
                        status,
                    ),
            );

        const someShipped =
            statuses.some(
                (status: string) =>
                    [
                        "shipped",
                        "delivered",
                    ].includes(
                        status,
                    ),
            );


        const allReady =
            statuses.every(
                (status: string) =>
                    [
                        "ready_for_pickup",
                        "shipped",
                        "delivered",
                    ].includes(
                        status,
                    ),
            );

        const someReady =
            statuses.some(
                (status: string) =>
                    [
                        "ready_for_pickup",
                        "shipped",
                        "delivered",
                    ].includes(
                        status,
                    ),
            );


        const someProcessing =
            statuses.some(
                (status: string) =>
                    [
                        "seller_accepted",
                        "picking_products",
                        "packing_order",
                    ].includes(
                        status,
                    ),
            );


        if (
            allCancelled
        ) {
            parentStatus =
                "cancelled";

        } else if (
            someCancelled
        ) {
            parentStatus =
                "partially_cancelled";

        } else if (
            allDelivered
        ) {
            parentStatus =
                "delivered";

        } else if (
            someDelivered
        ) {
            parentStatus =
                "partially_delivered";

        } else if (
            allShipped
        ) {
            parentStatus =
                "shipped";

        } else if (
            someShipped
        ) {
            parentStatus =
                "partially_shipped";

        } else if (
            allReady
        ) {
            parentStatus =
                "ready_for_pickup";

        } else if (
            someReady
        ) {
            parentStatus =
                "partially_ready";

        } else if (
            someProcessing
        ) {
            parentStatus =
                "processing";

        } else {
            parentStatus =
                "placed";
        }


        await this.repo
            .updateParentOrderStatus(
                parentOrderId,

                parentStatus,

                `Parent order synced from ${vendorOrders.length} vendor order(s)`,
            );
    }


    private async sendCustomerWhatsAppForVendorStatus({
        updatedOrder,
        previousOrder,
        status,
    }: {
        updatedOrder: any;

        previousOrder?: any;

        status: string;
    }) {
        try {
            /**
             * Only this status belongs to
             * the vendor status workflow.
             *
             * OUT_FOR_DELIVERY and DELIVERED
             * should be sent from the driver
             * delivery-status workflow.
             */
            if (
                status !==
                "seller_accepted"
            ) {
                return;
            }


            const mobile =
                this.getCustomerMobile(
                    updatedOrder,
                    previousOrder,
                );


            if (!mobile) {
                console.warn(
                    "Customer WhatsApp skipped: customer mobile not found",
                    {
                        vendorOrderId:
                            updatedOrder
                                ?._id
                                ?.toString?.(),

                        orderNumber:
                            updatedOrder
                                ?.orderNumber
                                ?.toString?.(),
                    },
                );

                return;
            }


            const orderNumber =
                this.getCustomerOrderNumber(
                    updatedOrder,
                    previousOrder,
                );


            if (!orderNumber) {
                console.warn(
                    "Customer WhatsApp skipped: order number not found",
                    {
                        vendorOrderId:
                            updatedOrder
                                ?._id
                                ?.toString?.(),
                    },
                );

                return;
            }


            const customerName =
                this.getCustomerName(
                    updatedOrder,
                    previousOrder,
                );


            const result =
                await this
                    .orderWhatsAppService
                    .send({
                        event:
                            "SELLER_ACCEPTED",

                        mobile,

                        customerName,

                        orderNumber,
                    });


            if (result) {
                console.log(
                    "Seller accepted WhatsApp result:",
                    {
                        vendorOrderId:
                            updatedOrder
                                ?._id
                                ?.toString?.(),

                        orderNumber,

                        requestId:
                            result
                                ?.request_id,

                        status:
                            result
                                ?.status,
                    },
                );
            }
        } catch (error: any) {
            /**
             * WhatsApp must never break
             * successful order processing.
             */
            console.error(
                "Seller accepted customer WhatsApp error:",
                error?.response?.data
                ||
                error?.message
                ||
                error,
            );
        }
    }


    private async sendDriverPushForVendorStatus({
        updatedOrder,
        previousOrder,
        status,
        remark,
    }: {
        updatedOrder: any;

        previousOrder: any;

        status: string;

        remark?: string;
    }) {
        try {
            const allowedStatuses = [
                "seller_accepted",
                "picking_products",
                "packing_order",
                "ready_for_pickup",
                "cancelled",
            ];

            if (
                !allowedStatuses.includes(
                    status,
                )
            ) {
                return;
            }

            if (
                status ===
                "seller_accepted"
            ) {
                await this
                    .sendSellerAcceptedPushToAllDrivers(
                        updatedOrder,
                    );

                return;
            }

            await this
                .sendStatusPushToAssignedDriver(
                    updatedOrder,
                    previousOrder,
                    status,
                    remark,
                );

        } catch (error: any) {
            console.log(
                "Driver push notification error:",
                error.message,
            );
        }
    }


    private async sendSellerAcceptedPushToAllDrivers(
        order: any,
    ) {
        try {
            const orderNumber =
                this.getOrderDisplayNumber(
                    order,
                );

            const result =
                await this
                    .firebaseTokenService
                    .sendNotificationToRole({
                        role:
                            "driver",

                        title:
                            driverPushTitleMap
                                .seller_accepted,

                        body:
                            orderNumber
                                ? `Order ${orderNumber} is accepted by seller and available for delivery.`
                                : "A seller accepted an order. You can accept this delivery now.",

                        data:
                            this.buildDriverPushData(
                                order,
                                "seller_accepted",
                                "NEW_DELIVERY_ORDER_AVAILABLE",
                                "DRIVER_AVAILABLE_ORDERS",
                            ),
                    });

            console.log(
                "Seller accepted driver push result:",
                result,
            );

        } catch (error: any) {
            console.log(
                "Seller accepted driver push error:",
                error.message,
            );
        }
    }


    private async sendStatusPushToAssignedDriver(
        updatedOrder: any,
        previousOrder: any,
        status: string,
        remark?: string,
    ) {
        try {
            const driverUserId =
                await this
                    .getAssignedDriverUserId(
                        updatedOrder,
                        previousOrder,
                    );

            if (!driverUserId) {
                console.log(
                    "Driver push skipped: assigned driver not found",
                );

                return;
            }

            const orderNumber =
                this.getOrderDisplayNumber(
                    updatedOrder,
                );

            const result =
                await this
                    .firebaseTokenService
                    .sendNotificationToUser({
                        userId:
                            driverUserId,

                        title:
                            driverPushTitleMap[
                            status
                            ]
                            ||
                            "Vendor order status updated",

                        body:
                            remark
                            ||
                            this.buildAssignedDriverPushBody(
                                orderNumber,
                                status,
                            ),

                        data:
                            this.buildDriverPushData(
                                updatedOrder,
                                status,
                                "VENDOR_ORDER_STATUS_UPDATED",
                                "DRIVER_ORDER_DETAILS",
                            ),
                    });

            console.log(
                "Assigned driver status push result:",
                result,
            );

        } catch (error: any) {
            console.log(
                "Assigned driver status push error:",
                error.message,
            );
        }
    }


    private async getAssignedDriverUserId(
        updatedOrder: any,
        previousOrder?: any,
    ) {
        const rawDriver =
            updatedOrder?.driver
            ||
            updatedOrder?.driverProfile
            ||
            updatedOrder?.assignedDriver
            ||
            updatedOrder?.deliveryDriver
            ||
            previousOrder?.driver
            ||
            previousOrder?.driverProfile
            ||
            previousOrder?.assignedDriver
            ||
            previousOrder?.deliveryDriver;


        if (!rawDriver) {
            return "";
        }


        if (
            typeof rawDriver ===
            "object"
        ) {
            if (
                rawDriver.user
            ) {
                return (
                    rawDriver.user
                        ?.toString?.()
                    ||
                    ""
                );
            }


            if (
                rawDriver._id
            ) {
                const userIdFromProfile =
                    await this
                        .findUserIdFromDriverProfile(
                            rawDriver._id,
                        );

                if (
                    userIdFromProfile
                ) {
                    return userIdFromProfile;
                }

                return (
                    rawDriver._id
                        ?.toString?.()
                    ||
                    ""
                );
            }
        }


        const userIdFromProfile =
            await this
                .findUserIdFromDriverProfile(
                    rawDriver,
                );


        if (
            userIdFromProfile
        ) {
            return userIdFromProfile;
        }


        return (
            rawDriver
                ?.toString?.()
            ||
            ""
        );
    }


    private async findUserIdFromDriverProfile(
        driverProfileId: any,
    ) {
        try {
            if (
                !driverProfileId
            ) {
                return "";
            }

            const driverProfile: any =
                await DriverProfileModel
                    .findById(
                        driverProfileId,
                    )
                    .select(
                        "user",
                    )
                    .lean();

            return (
                driverProfile
                    ?.user
                    ?.toString?.()
                ||
                ""
            );

        } catch (error: any) {
            console.log(
                "Find driver profile user error:",
                error.message,
            );

            return "";
        }
    }


    private getCustomerMobile(
        updatedOrder: any,
        previousOrder?: any,
    ): string {
        const mobile =
            updatedOrder
                ?.customerMobile
            ||
            updatedOrder
                ?.customerPhone
            ||
            updatedOrder
                ?.customer
                ?.mobileNumber
            ||
            updatedOrder
                ?.customer
                ?.mobile
            ||
            updatedOrder
                ?.customer
                ?.phone
            ||
            updatedOrder
                ?.user
                ?.mobileNumber
            ||
            updatedOrder
                ?.user
                ?.mobile
            ||
            updatedOrder
                ?.user
                ?.phone
            ||
            updatedOrder
                ?.shippingAddress
                ?.mobileNumber
            ||
            updatedOrder
                ?.shippingAddress
                ?.mobile
            ||
            updatedOrder
                ?.shippingAddress
                ?.phone
            ||
            updatedOrder
                ?.deliveryAddress
                ?.mobileNumber
            ||
            updatedOrder
                ?.deliveryAddress
                ?.mobile
            ||
            updatedOrder
                ?.deliveryAddress
                ?.phone
            ||
            previousOrder
                ?.customerMobile
            ||
            previousOrder
                ?.customerPhone
            ||
            previousOrder
                ?.customer
                ?.mobileNumber
            ||
            previousOrder
                ?.customer
                ?.mobile
            ||
            previousOrder
                ?.customer
                ?.phone
            ||
            previousOrder
                ?.user
                ?.mobileNumber
            ||
            previousOrder
                ?.user
                ?.mobile
            ||
            previousOrder
                ?.user
                ?.phone
            ||
            previousOrder
                ?.shippingAddress
                ?.mobileNumber
            ||
            previousOrder
                ?.shippingAddress
                ?.mobile
            ||
            previousOrder
                ?.shippingAddress
                ?.phone
            ||
            previousOrder
                ?.deliveryAddress
                ?.mobileNumber
            ||
            previousOrder
                ?.deliveryAddress
                ?.mobile
            ||
            previousOrder
                ?.deliveryAddress
                ?.phone
            ||
            "";

        return (
            mobile
                ?.toString?.()
                ?.trim?.()
            ||
            ""
        );
    }


    private getCustomerName(
        updatedOrder: any,
        previousOrder?: any,
    ): string {
        const firstName =
            updatedOrder
                ?.customer
                ?.firstName
            ||
            updatedOrder
                ?.user
                ?.firstName
            ||
            previousOrder
                ?.customer
                ?.firstName
            ||
            previousOrder
                ?.user
                ?.firstName;


        const lastName =
            updatedOrder
                ?.customer
                ?.lastName
            ||
            updatedOrder
                ?.user
                ?.lastName
            ||
            previousOrder
                ?.customer
                ?.lastName
            ||
            previousOrder
                ?.user
                ?.lastName;


        const combinedName = [
            firstName,
            lastName,
        ]
            .filter(
                Boolean,
            )
            .join(
                " ",
            )
            .trim();


        const name =
            updatedOrder
                ?.customerName
            ||
            updatedOrder
                ?.customer
                ?.name
            ||
            updatedOrder
                ?.customer
                ?.fullName
            ||
            updatedOrder
                ?.user
                ?.name
            ||
            updatedOrder
                ?.shippingAddress
                ?.name
            ||
            updatedOrder
                ?.deliveryAddress
                ?.name
            ||
            previousOrder
                ?.customerName
            ||
            previousOrder
                ?.customer
                ?.name
            ||
            previousOrder
                ?.customer
                ?.fullName
            ||
            previousOrder
                ?.user
                ?.name
            ||
            previousOrder
                ?.shippingAddress
                ?.name
            ||
            previousOrder
                ?.deliveryAddress
                ?.name
            ||
            combinedName
            ||
            "Customer";


        return (
            name
                ?.toString?.()
                ?.trim?.()
            ||
            "Customer"
        );
    }


    private getCustomerOrderNumber(
        updatedOrder: any,
        previousOrder?: any,
    ): string {
        return (
            updatedOrder
                ?.orderNumber
                ?.toString?.()
            ||
            previousOrder
                ?.orderNumber
                ?.toString?.()
            ||
            updatedOrder
                ?.vendorOrderNumber
                ?.toString?.()
            ||
            previousOrder
                ?.vendorOrderNumber
                ?.toString?.()
            ||
            ""
        );
    }


    private getOrderDisplayNumber(
        order: any,
    ) {
        return (
            order
                ?.vendorOrderNumber
                ?.toString?.()
            ||
            order
                ?.orderNumber
                ?.toString?.()
            ||
            ""
        );
    }


    private buildAssignedDriverPushBody(
        orderNumber: string,
        status: string,
    ) {
        if (
            status ===
            "picking_products"
        ) {
            return orderNumber
                ? `Seller started picking products for order ${orderNumber}.`
                : "Seller started picking products.";
        }


        if (
            status ===
            "packing_order"
        ) {
            return orderNumber
                ? `Seller started packing order ${orderNumber}.`
                : "Seller started packing order.";
        }


        if (
            status ===
            "ready_for_pickup"
        ) {
            return orderNumber
                ? `Order ${orderNumber} is ready for pickup.`
                : "Order is ready for pickup.";
        }


        if (
            status ===
            "cancelled"
        ) {
            return orderNumber
                ? `Order ${orderNumber} has been cancelled by seller.`
                : "Vendor order has been cancelled.";
        }


        return orderNumber
            ? `Order ${orderNumber} status has been updated.`
            : "Vendor order status has been updated.";
    }


    private buildDriverPushData(
        order: any,
        status: string,
        type: string,
        screen: string,
    ) {
        return {
            type,

            screen,

            vendorOrderId:
                order
                    ?._id
                    ?.toString?.()
                ||
                "",

            parentOrderId:
                order
                    ?.parentOrder
                    ?.toString?.()
                ||
                "",

            orderNumber:
                order
                    ?.orderNumber
                    ?.toString?.()
                ||
                "",

            vendorOrderNumber:
                order
                    ?.vendorOrderNumber
                    ?.toString?.()
                ||
                "",

            vendorStatus:
                status,

            deliveryStatus:
                order
                    ?.deliveryStatus
                    ?.toString?.()
                ||
                "",

            click_action:
                "FLUTTER_NOTIFICATION_CLICK",
        };
    }
}