import { ProductModel } from "../../product/models/product.model.js";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";

const ACTIVE_DRIVER_STATUSES = [
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
];

const ACCEPTED_DRIVER_STATUSES = [
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
];

const FINAL_DRIVER_STATUSES = [
    "delivered",
    "failed",
    "returned",
];

export class DriverOrderRepository {
    private toPlain(order: any) {
        if (!order) return order;

        if (order?.toObject) {
            return order.toObject({
                virtuals: false,
            });
        }

        return order;
    }

    private getId(value: any) {
        if (!value) return "";

        if (typeof value === "string") {
            return value;
        }

        return String(value?._id || value?.id || value || "");
    }

    private async attachVendorProfile(order: any) {
        if (!order) return order;

        const plainOrder = this.toPlain(order);
        const vendorId = this.getId(plainOrder?.vendor);

        const safeOrder = {
            ...plainOrder,
            items: Array.isArray(plainOrder?.items) ? plainOrder.items : [],
            totalItems: Array.isArray(plainOrder?.items)
                ? plainOrder.items.reduce((sum: number, item: any) => {
                    return sum + Number(item?.quantity || 0);
                }, 0)
                : 0,
        };

        if (!vendorId) {
            return {
                ...safeOrder,
                vendorProfile: null,
            };
        }

        const vendorProfile = await VendorProfileModel.findOne({
            user: vendorId,
        })
            .select(
                "user storeName storeLogo storeLocationAddress workingHours workingDays isVerified isOnHoliday holidayMessage profileStatus"
            )
            .lean();

        return {
            ...safeOrder,
            vendorProfile: vendorProfile || null,
        };
    }

    private withPopulate(query: any) {
        return query
            .populate("parentOrder", "orderNumber status paymentStatus totalAmount")
            .populate("user", "firstName lastName mobileNumber email")
            .populate("vendor", "firstName lastName mobileNumber email")
            .populate("driver")
            .populate("items.product", "name slug images productCategory category vendorId")
            .populate("paymentMethod")
            .populate("paymentTransaction");
    }

    private getAvailableBaseQuery(filter: any = {}) {
        console.log(filter)
        const query: any = {
            // isActive: true,
            paymentStatus: "success",

            /**
             * Available for driver only when seller/order is not completed/cancelled
             * and delivery is not assigned to any driver.
             */
            status: {
                $in: [
                    "placed",
                    "seller_accepted",
                    "picking_products",
                    "packing_order",
                    "ready_for_pickup",
                ],
            },

            sellerStatus: {
                $in: [
                    "placed",
                    "accepted",
                    "picking_products",
                    "packing_order",
                    "ready_for_pickup",
                    "pending_acceptance",
                ],
            },

            $and: [
                {
                    $or: [
                        { deliveryStatus: "not_assigned" },
                        { deliveryStatus: { $exists: false } },
                        { deliveryStatus: null },
                    ],
                },
                {
                    $or: [
                        { driver: { $exists: false } },
                        { driver: null },
                    ],
                },
            ],
        };

        if (filter.status) {
            query.status = filter.status;
        }

        if (filter.sellerStatus) {
            query.sellerStatus = filter.sellerStatus;
        }

        if (filter.orderNumber) {
            query.$and.push({
                $or: [
                    {
                        orderNumber: {
                            $regex: filter.orderNumber,
                            $options: "i",
                        },
                    },
                    {
                        vendorOrderNumber: {
                            $regex: filter.orderNumber,
                            $options: "i",
                        },
                    },
                ],
            });
        }

        return query;
    }

    async findById(orderId: string, includeHiddenFields = false) {
        let query = OrderVendorModel.findOne({
            _id: orderId,
            isActive: true,
        });

        if (includeHiddenFields) {
            query = query.select(
                "+pickupVerification.pickupOtp +pickupVerification.pickupQrCode +customerVerification.deliveryOtp"
            );
        }

        return await query;
    }

    async findDriverOrderById(
        orderId: string,
        driverId: string,
        includeHiddenFields = false
    ) {
        let query = OrderVendorModel.findOne({
            _id: orderId,
            driver: driverId,
            isActive: true,
        });

        if (includeHiddenFields) {
            query = query.select(
                "+pickupVerification.pickupOtp +pickupVerification.pickupQrCode +customerVerification.deliveryOtp"
            );
        }

        return await query;
    }

    async findAvailableOrders(
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.max(1, Number(limit) || 10);
        const skip = (safePage - 1) * safeLimit;

        const query = this.getAvailableBaseQuery(filter);

        const [orders, total] = await Promise.all([
            this.withPopulate(
                OrderVendorModel.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(safeLimit)
            ),
            OrderVendorModel.countDocuments(query),
        ]);

        const items = await Promise.all(
            orders.map((order: any) => this.attachVendorProfile(order))
        );

        return {
            items,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        };
    }

    async assignDriver(orderId: string, driverId: string, updateData: any) {
        const query = this.getAvailableBaseQuery();

        const order = await this.withPopulate(
            OrderVendorModel.findOneAndUpdate(
                {
                    _id: orderId,
                    ...query,
                },
                updateData,
                {
                    new: true,
                    runValidators: true,
                }
            )
        );

        return await this.attachVendorProfile(order);
    }

    async takeOrder(orderId: string, driverId: string, updateData: any) {
        const query = this.getAvailableBaseQuery();

        const order = await this.withPopulate(
            OrderVendorModel.findOneAndUpdate(
                {
                    _id: orderId,
                    ...query,
                },
                updateData,
                {
                    new: true,
                    runValidators: true,
                }
            )
        );

        return await this.attachVendorProfile(order);
    }

    async updateDeliveryStatus(orderId: string, driverId: string, updateData: any) {
        const order = await this.withPopulate(
            OrderVendorModel.findOneAndUpdate(
                {
                    _id: orderId,
                    driver: driverId,
                    isActive: true,
                },
                updateData,
                {
                    new: true,
                    runValidators: true,
                }
            )
        );

        return await this.attachVendorProfile(order);
    }

    async findByDriver(
        driverId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.max(1, Number(limit) || 10);
        const skip = (safePage - 1) * safeLimit;

        const query: any = {
            driver: driverId,
            isActive: true,
            deliveryStatus: {
                $nin: FINAL_DRIVER_STATUSES,
            },
        };

        if (filter.deliveryStatus) {
            query.deliveryStatus = filter.deliveryStatus;
        }

        if (filter.status) {
            query.status = filter.status;
        }

        if (filter.orderNumber) {
            query.$or = [
                {
                    orderNumber: {
                        $regex: filter.orderNumber,
                        $options: "i",
                    },
                },
                {
                    vendorOrderNumber: {
                        $regex: filter.orderNumber,
                        $options: "i",
                    },
                },
            ];
        }

        const [orders, total] = await Promise.all([
            this.withPopulate(
                OrderVendorModel.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(safeLimit)
            ),
            OrderVendorModel.countDocuments(query),
        ]);

        const items = await Promise.all(
            orders.map((order: any) => this.attachVendorProfile(order))
        );

        return {
            items,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        };
    }

    async getHistory(
        driverId: string,
        page = 1,
        limit = 10,
        filter: any = {}
    ) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.max(1, Number(limit) || 10);
        const skip = (safePage - 1) * safeLimit;

        const query: any = {
            driver: driverId,
            isActive: true,
            deliveryStatus: {
                $in: FINAL_DRIVER_STATUSES,
            },
        };

        if (filter.orderNumber) {
            query.$or = [
                {
                    orderNumber: {
                        $regex: filter.orderNumber,
                        $options: "i",
                    },
                },
                {
                    vendorOrderNumber: {
                        $regex: filter.orderNumber,
                        $options: "i",
                    },
                },
            ];
        }

        if (filter.fromDate || filter.toDate) {
            query.createdAt = {};

            if (filter.fromDate) {
                query.createdAt.$gte = new Date(filter.fromDate);
            }

            if (filter.toDate) {
                const toDate = new Date(filter.toDate);
                toDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = toDate;
            }
        }

        const [orders, total] = await Promise.all([
            this.withPopulate(
                OrderVendorModel.find(query)
                    .sort({ deliveredAt: -1, updatedAt: -1, createdAt: -1 })
                    .skip(skip)
                    .limit(safeLimit)
            ),
            OrderVendorModel.countDocuments(query),
        ]);

        const items = await Promise.all(
            orders.map((order: any) => this.attachVendorProfile(order))
        );

        return {
            items,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        };
    }

    async getStats(driverId: string) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const availableOrdersQuery: any = {
            isActive: true,

            $or: [
                { driver: { $exists: false } },
                { driver: null },
            ],

            deliveryStatus: "not_assigned",

            status: {
                $in: [
                    "placed",
                    "seller_accepted",
                    "picking_products",
                    "packing_order",
                    "ready_for_pickup",
                ],
            },

            sellerStatus: {
                $in: [
                    "accepted",
                    "picking_products",
                    "packing_order",
                    "ready_for_pickup",
                ],
            },
        };

        const driverBaseQuery: any = {
            driver: driverId,
            isActive: true,
        };

        /**
         * My Orders means:
         * all assigned driver orders except delivered and returned.
         *
         * Failed is kept inside My Orders because you said exclude only:
         * delivered and returned.
         */
        const myOrdersQuery: any = {
            ...driverBaseQuery,
            deliveryStatus: {
                $nin: ["delivered", "returned"],
            },
        };

        const [
            availableOrders,
            myOrders,
            assignedOrders,
            acceptedOrders,
            proceedingToStoreOrders,
            reachedStoreOrders,
            waitingForPackingOrders,
            pickupVerificationPendingOrders,
            pickupVerifiedOrders,
            pickedUpOrders,
            outForDeliveryOrders,
            reachedCustomerOrders,
            customerVerificationPendingOrders,
            deliveredOrders,
            returnedOrders,
            failedOrders,
            todayAssignedOrders,
            todayDeliveredOrders,
            totalDriverOrders,
        ] = await Promise.all([
            OrderVendorModel.countDocuments(availableOrdersQuery),

            /**
             * Main My Orders count.
             * Includes assigned + all running statuses + failed.
             * Excludes only delivered and returned.
             */
            OrderVendorModel.countDocuments(myOrdersQuery),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "assigned",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "delivery_accepted",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "proceeding_to_store",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "reached_store",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "waiting_for_packing",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "pickup_verification_pending",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "pickup_verified",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "picked_up",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "out_for_delivery",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "reached_customer",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "customer_verification_pending",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                status: "delivered",
                deliveryStatus: "delivered",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                $or: [
                    { status: "returned" },
                    { deliveryStatus: "returned" },
                ],
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                deliveryStatus: "failed",
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                driverAssignedAt: {
                    $gte: startOfToday,
                    $lte: endOfToday,
                },
            }),

            OrderVendorModel.countDocuments({
                ...driverBaseQuery,
                status: "delivered",
                deliveryStatus: "delivered",
                deliveredAt: {
                    $gte: startOfToday,
                    $lte: endOfToday,
                },
            }),

            OrderVendorModel.countDocuments(driverBaseQuery),
        ]);

        const activeOrders =
            assignedOrders +
            acceptedOrders +
            proceedingToStoreOrders +
            reachedStoreOrders +
            waitingForPackingOrders +
            pickupVerificationPendingOrders +
            pickupVerifiedOrders +
            pickedUpOrders +
            outForDeliveryOrders +
            reachedCustomerOrders +
            customerVerificationPendingOrders;

        return {
            /**
             * Main dashboard counts
             */
            availableOrders,
            myOrders,
            deliveredOrders,
            returnedOrders,

            /**
             * Old keys kept for safety.
             * acceptedOrders is still only delivery_accepted count,
             * but dashboard should use myOrders now.
             */
            acceptedOrders,

            /**
             * Frontend aliases
             */
            available: availableOrders,
            my: myOrders,
            delivered: deliveredOrders,
            returned: returnedOrders,

            cards: {
                available: availableOrders,
                myOrders,
                my: myOrders,
                delivered: deliveredOrders,
                returned: returnedOrders,
            },

            /**
             * Extra counts
             */
            totalDriverOrders,
            activeOrders,
            currentOrders: myOrders,
            failedOrders,
            todayAssignedOrders,
            todayDeliveredOrders,

            breakdown: {
                assigned: assignedOrders,
                delivery_accepted: acceptedOrders,
                proceeding_to_store: proceedingToStoreOrders,
                reached_store: reachedStoreOrders,
                waiting_for_packing: waitingForPackingOrders,
                pickup_verification_pending: pickupVerificationPendingOrders,
                pickup_verified: pickupVerifiedOrders,
                picked_up: pickedUpOrders,
                out_for_delivery: outForDeliveryOrders,
                reached_customer: reachedCustomerOrders,
                customer_verification_pending: customerVerificationPendingOrders,
                failed: failedOrders,
                delivered: deliveredOrders,
                returned: returnedOrders,
            },
        };
    }

    private buildAvailableStockQuery(requiredQuantity: number) {
        return {
            $or: [
                { stock: { $gte: requiredQuantity } },
                { quantity: { $gte: requiredQuantity } },
                { availableQuantity: { $gte: requiredQuantity } },
                { stockQuantity: { $gte: requiredQuantity } },
            ],
        };
    }

    async findReassignVendorsForItem(payload: {
        productId: string;
        variantId?: string | null;
        currentVendorId: string;
        requiredQuantity: number;
    }) {
        const currentProduct: any = await ProductModel.findById(payload.productId)
            .select("name slug productCategory category subCategory brand")
            .lean();

        if (!currentProduct) {
            throw new Error("Product not found");
        }

        const productMatchQuery: any = {
            isActive: true,

            $and: [
                {
                    vendorId: {
                        $exists: true,
                        $nin: [null, payload.currentVendorId],
                    },
                },
            ],

            $or: [
                { name: currentProduct.name },
                { slug: currentProduct.slug },

                ...(currentProduct.productCategory
                    ? [{ productCategory: currentProduct.productCategory }]
                    : []),

                ...(currentProduct.category
                    ? [{ category: currentProduct.category }]
                    : []),
            ],
        };

        if (payload.variantId) {
            productMatchQuery.$and.push({
                $or: [
                    { "variants._id": payload.variantId },
                    { variants: { $exists: false } },
                    { variants: { $size: 0 } },
                ],
            });
        }

        const products: any[] = await ProductModel.find(productMatchQuery)
            .select(
                "name slug images price mrp stock quantity availableQuantity stockQuantity vendorId productCategory category"
            )
            .populate("vendorId", "firstName lastName mobileNumber email")
            .sort({ updatedAt: -1 })
            .lean();


        const vendorIds = [
            ...new Set(
                products
                    .map((product: any) =>
                        String(product.vendorId?._id || product.vendorId || "")
                    )
                    .filter(Boolean)
            ),
        ];

        console.log("Found products for reassignment:", vendorIds, "vendors");


        const vendorProfiles = await VendorProfileModel.find({
            user: { $in: vendorIds },
            // isActive: true,
            // profileStatus: { $in: ["approved", "active", "verified"] },
            // isOnHoliday: { $ne: true },
        })
            .select(
                "user storeName storeLogo storeLocationAddress workingHours workingDays isVerified isOnHoliday holidayMessage profileStatus"
            )
            .lean();

        console.log("Found vendor profiles for reassignment:", vendorProfiles.length, "profiles");

        const profileMap = new Map(
            vendorProfiles.map((profile: any) => [String(profile.user), profile])
        );

        const vendorMap = new Map<string, any>();

        for (const product of products) {
            const vendorId = String(product.vendorId?._id || product.vendorId || "");

            if (!vendorId || vendorId === String(payload.currentVendorId)) {
                continue;
            }

            const vendorProfile = profileMap.get(vendorId);

            if (!vendorProfile) {
                continue;
            }

            const availableQuantity = Number(
                product.availableQuantity ??
                product.stockQuantity ??
                product.quantity ??
                product.stock ??
                0
            );

            const productData = {
                productId: product._id,
                name: product.name,
                slug: product.slug,
                images: product.images || [],
                price: product.price,
                mrp: product.mrp,

                // Only for display. No filtering/checking.
                availableQuantity,

                productCategory: product.productCategory,
                category: product.category,
            };

            const existingVendor = vendorMap.get(vendorId);

            if (existingVendor) {
                existingVendor.products.push(productData);

                existingVendor.availableQuantity = Math.max(
                    Number(existingVendor.availableQuantity || 0),
                    availableQuantity
                );
            } else {
                vendorMap.set(vendorId, {
                    vendorId,
                    vendorUser: product.vendorId || null,
                    vendorProfile,

                    storeName: vendorProfile?.storeName || "Seller",
                    storeLogo: vendorProfile?.storeLogo || "",
                    storeLocationAddress: vendorProfile?.storeLocationAddress || null,
                    workingHours: vendorProfile?.workingHours || null,
                    workingDays: vendorProfile?.workingDays || [],
                    isVerified: !!vendorProfile?.isVerified,
                    profileStatus: vendorProfile?.profileStatus || "",

                    // Only for display. Vendor will still come even if 0.
                    availableQuantity,

                    products: [productData],
                });
            }
        }

        return Array.from(vendorMap.values());
    }
}