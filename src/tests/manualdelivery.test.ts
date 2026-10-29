import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { ManualDeliveryService } from "../modules/manualdelivery/services/manualdelivery.service.js";
import { ManualDeliveryDistanceService } from "../modules/manualdelivery/services/manualdelivery-distance.service.js";
import {
    createManualDeliverySchema,
    updateManualDeliverySchema,
    assignDriverSchema,
    driverStatusUpdateSchema,
} from "../modules/manualdelivery/validations/manualdelivery.validation.js";
import {
    MANUAL_DELIVERY_STATUS,
    DISTANCE_CALCULATION_METHOD,
} from "../modules/manualdelivery/constants/manualdelivery.constants.js";
import {
    parseMapLinkToCoordinates,
    extractCoordinatesFromUrlString,
} from "../modules/manualdelivery/services/manualdelivery-maplink.service.js";
import { BadRequestException } from "../utils/appError.js";
import axios from "axios";
import { ManualDeliveryWhatsAppService } from "../modules/manualdelivery/services/manualdelivery-whatsapp.service.js";

// Test IDs
const vendorUserId = new Types.ObjectId().toString();
const vendorProfileId = new Types.ObjectId().toString();
const otherVendorUserId = new Types.ObjectId().toString();
const adminUserId = new Types.ObjectId().toString();
const driverUserId = new Types.ObjectId().toString();
const driverProfileId = new Types.ObjectId().toString();
const otherDriverUserId = new Types.ObjectId().toString();
const otherDriverProfileId = new Types.ObjectId().toString();

const sampleVendorProfile = {
    _id: new Types.ObjectId(vendorProfileId),
    user: new Types.ObjectId(vendorUserId),
    storeName: "Sharma Kirana Store",
    storeLocationAddress: {
        addressLine1: "Shop 12, Market Complex",
        addressLine2: "Opposite Civil Hospital",
        area: "Alkapuri",
        city: "Vadodara",
        state: "Gujarat",
        postalCode: "390007",
        country: "India",
        landmark: "Civil Hospital",
        latitude: 22.3072,
        longitude: 73.1812,
        location: {
            type: "Point",
            coordinates: [73.1812, 22.3072],
        },
    },
};

const sampleDriverProfile = {
    _id: new Types.ObjectId(driverProfileId),
    user: {
        _id: new Types.ObjectId(driverUserId),
        firstName: "Vikram",
        lastName: "Rathore",
        mobileNumber: "9876543210",
        role: "driver",
    },
    vehicleType: "bike",
    vehicleNumber: "GJ06AB1234",
    profileStatus: "approved",
    isOnline: true,
};

const sampleOtherDriverProfile = {
    _id: new Types.ObjectId(otherDriverProfileId),
    user: {
        _id: new Types.ObjectId(otherDriverUserId),
        firstName: "Amit",
        lastName: "Patel",
        mobileNumber: "9876500000",
        role: "driver",
    },
    vehicleType: "bike",
    vehicleNumber: "GJ06CD5678",
    profileStatus: "approved",
    isOnline: true,
};

const sampleUsers: Record<string, any> = {
    [vendorUserId]: {
        _id: new Types.ObjectId(vendorUserId),
        firstName: "Ramesh",
        lastName: "Sharma",
        mobileNumber: "9123456789",
        role: "vendor",
        roles: ["vendor"],
    },
    [otherVendorUserId]: {
        _id: new Types.ObjectId(otherVendorUserId),
        firstName: "Kiran",
        lastName: "Patel",
        mobileNumber: "9123400000",
        role: "vendor",
        roles: ["vendor"],
    },
    [adminUserId]: {
        _id: new Types.ObjectId(adminUserId),
        firstName: "System",
        lastName: "Admin",
        mobileNumber: "9999999999",
        role: "admin",
        roles: ["admin"],
    },
    [driverUserId]: sampleDriverProfile.user,
    [otherDriverUserId]: sampleOtherDriverProfile.user,
};

/**
 * Creates an in-memory repository harness for isolated Manual Delivery testing.
 */
function createManualDeliveryTestHarness() {
    const service: any = new ManualDeliveryService();
    service.whatsappService = { async sendCreated() { return null; } };
    service.notificationService = {
        broadcasts: [] as any[],
        assignedPushes: [] as any[],
        vendorUpdates: [] as any[],
        async notifyDriversNewAvailableDelivery(delivery: any) {
            this.broadcasts.push(delivery);
        },
        async notifyAssignedDriver(delivery: any, driverUserId: any) {
            this.assignedPushes.push({ delivery, driverUserId });
        },
        async notifyVendorStatusUpdate(delivery: any, status: any, remark: any) {
            this.vendorUpdates.push({ delivery, status, remark });
        },
    };
    const storeMap = new Map<string, any>();
    let counter = 1;

    // In-memory mock repository
    service.repo = {
        async generateDeliveryNumber() {
            const num = `MDEL-20261021-${String(counter++).padStart(4, "0")}`;
            return num;
        },

        async findUserById(id: string) {
            return sampleUsers[id.toString()] || null;
        },

        async findVendorProfileByUserId(userId: string) {
            if (userId.toString() === vendorUserId) {
                return sampleVendorProfile;
            }
            return null;
        },

        async findDriverProfile(driverIdentifier: string) {
            const id = driverIdentifier.toString();
            if (id === driverProfileId || id === driverUserId) {
                return sampleDriverProfile;
            }
            if (id === otherDriverProfileId || id === otherDriverUserId) {
                return sampleOtherDriverProfile;
            }
            return null;
        },

        async create(data: any) {
            const id = new Types.ObjectId().toString();
            const doc = {
                _id: id,
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            storeMap.set(id, doc);
            return doc;
        },

        async findById(id: string) {
            const doc = storeMap.get(id.toString());
            if (!doc) return null;
            return { ...doc };
        },

        async findWithPagination(filters: any, pagination: any) {
            let items = Array.from(storeMap.values()).filter((d) => d.isActive);

            if (filters.vendor) {
                items = items.filter(
                    (d) => d.vendor.toString() === filters.vendor.toString()
                );
            }

            if (filters.driver) {
                items = items.filter(
                    (d) => d.driver?.toString() === filters.driver.toString()
                );
            }

            if (filters.status) {
                items = items.filter((d) => d.status === filters.status);
            }

            if (filters.search) {
                const s = filters.search.toLowerCase();
                items = items.filter(
                    (d) =>
                        d.deliveryNumber.toLowerCase().includes(s) ||
                        d.customer.name.toLowerCase().includes(s) ||
                        d.customer.mobileNumber.includes(s)
                );
            }

            const total = items.length;
            const page = pagination.page || 1;
            const limit = pagination.limit || 10;
            const start = (page - 1) * limit;
            const deliveries = items.slice(start, start + limit);

            return { deliveries, total };
        },

        async assignDriverAtomic(
            deliveryId: string,
            driverProfileIdParam: any,
            driverUserIdParam: any,
            driverSnapshot: any,
            statusHistoryEntry: any,
            assignmentHistoryEntry: any
        ) {
            const doc = storeMap.get(deliveryId.toString());
            if (!doc || doc.status !== MANUAL_DELIVERY_STATUS.CREATED) {
                return null;
            }

            doc.driver = driverProfileIdParam;
            doc.driverUser = driverUserIdParam;
            doc.driverSnapshot = driverSnapshot;
            doc.status = MANUAL_DELIVERY_STATUS.ASSIGNED;
            doc.assignedAt = new Date();
            doc.statusHistory.push(statusHistoryEntry);
            doc.assignmentHistory.push(assignmentHistoryEntry);
            storeMap.set(deliveryId.toString(), doc);
            return { ...doc };
        },

        async driverAcceptAtomic(
            deliveryId: string,
            driverProfileIdParam: any,
            statusHistoryEntry: any
        ) {
            const doc = storeMap.get(deliveryId.toString());
            if (
                !doc ||
                doc.driver?.toString() !== driverProfileIdParam.toString() ||
                doc.status !== MANUAL_DELIVERY_STATUS.ASSIGNED
            ) {
                return null;
            }

            doc.status = MANUAL_DELIVERY_STATUS.ACCEPTED;
            doc.acceptedAt = new Date();
            doc.statusHistory.push(statusHistoryEntry);
            doc.assignmentHistory.push({
                driver: driverProfileIdParam,
                action: "ACCEPTED",
                assignedAt: doc.assignedAt,
                respondedAt: new Date(),
            });
            storeMap.set(deliveryId.toString(), doc);
            return { ...doc };
        },

        async driverRejectAtomic(
            deliveryId: string,
            driverProfileIdParam: any,
            reason: string,
            statusHistoryEntry: any,
            assignmentHistoryEntry: any
        ) {
            const doc = storeMap.get(deliveryId.toString());
            if (
                !doc ||
                doc.driver?.toString() !== driverProfileIdParam.toString() ||
                doc.status !== MANUAL_DELIVERY_STATUS.ASSIGNED
            ) {
                return null;
            }

            doc.status = MANUAL_DELIVERY_STATUS.CREATED;
            doc.driver = null;
            doc.driverUser = null;
            doc.driverSnapshot = null;
            doc.assignedAt = null;
            doc.rejectionReason = reason;
            doc.statusHistory.push(statusHistoryEntry);
            doc.assignmentHistory.push(assignmentHistoryEntry);
            storeMap.set(deliveryId.toString(), doc);
            return { ...doc };
        },

        async driverUpdateStatusAtomic(
            deliveryId: string,
            driverProfileIdParam: any,
            fromStatuses: string[],
            newStatus: string,
            timestampField: string,
            extraUpdates: any,
            statusHistoryEntry: any
        ) {
            const doc = storeMap.get(deliveryId.toString());
            if (
                !doc ||
                doc.driver?.toString() !== driverProfileIdParam.toString() ||
                !fromStatuses.includes(doc.status)
            ) {
                return null;
            }

            doc.status = newStatus;
            doc[timestampField] = new Date();
            Object.assign(doc, extraUpdates);
            doc.statusHistory.push(statusHistoryEntry);
            storeMap.set(deliveryId.toString(), doc);
            return { ...doc };
        },

        async cancelDeliveryAtomic(
            deliveryId: string,
            vendorOrAdminFilter: any,
            reason: string,
            statusHistoryEntry: any
        ) {
            const doc = storeMap.get(deliveryId.toString());
            if (!doc) return null;

            if (
                vendorOrAdminFilter.vendor &&
                doc.vendor.toString() !== vendorOrAdminFilter.vendor.toString()
            ) {
                return null;
            }

            if (
                [
                    MANUAL_DELIVERY_STATUS.DELIVERED,
                    MANUAL_DELIVERY_STATUS.CANCELLED,
                    MANUAL_DELIVERY_STATUS.FAILED,
                    MANUAL_DELIVERY_STATUS.ACCEPTED,
                    MANUAL_DELIVERY_STATUS.PICKED_UP,
                    MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY,
                    MANUAL_DELIVERY_STATUS.REACHED,
                ].includes(doc.status) ||
                doc.acceptedAt
            ) {
                return null;
            }

            doc.status = MANUAL_DELIVERY_STATUS.CANCELLED;
            doc.cancelledAt = new Date();
            doc.cancellationReason = reason;
            doc.statusHistory.push(statusHistoryEntry);
            storeMap.set(deliveryId.toString(), doc);
            return { ...doc };
        },

        async updateById(id: string, updateDoc: any) {
            const doc = storeMap.get(id.toString());
            if (!doc) return null;

            if (updateDoc.$set) {
                for (const [k, v] of Object.entries(updateDoc.$set)) {
                    if (k.startsWith("dropoff.")) {
                        const subKey = k.replace("dropoff.", "");
                        doc.dropoff[subKey] = v;
                    } else if (k.startsWith("customer.")) {
                        const subKey = k.replace("customer.", "");
                        doc.customer[subKey] = v;
                    } else {
                        doc[k] = v;
                    }
                }
            }
            storeMap.set(id.toString(), doc);
            return { ...doc };
        },

        async findAvailableDeliveries(filters: any, pagination: any) {
            let items = Array.from(storeMap.values()).filter(
                (d) => d.isActive && d.status === MANUAL_DELIVERY_STATUS.CREATED && !d.driver
            );
            if (filters.city) {
                const s = filters.city.toLowerCase();
                items = items.filter(
                    (d) =>
                        d.pickup?.city?.toLowerCase()?.includes(s) ||
                        d.dropoff?.city?.toLowerCase()?.includes(s)
                );
            }
            if (filters.search) {
                const s = filters.search.toLowerCase();
                items = items.filter(
                    (d) =>
                        d.deliveryNumber.toLowerCase().includes(s) ||
                        d.customer.name.toLowerCase().includes(s)
                );
            }
            const total = items.length;
            const page = pagination.page || 1;
            const limit = pagination.limit || 10;
            const start = (page - 1) * limit;
            const deliveries = items.slice(start, start + limit);
            return { deliveries, total };
        },

        async driverTakeOrderAtomic(
            deliveryId: string,
            driverProfileIdParam: any,
            driverUserIdParam: any,
            driverSnapshot: any,
            statusHistoryEntry: any,
            assignmentHistoryEntry: any
        ) {
            const doc = storeMap.get(deliveryId.toString());
            if (!doc || doc.status !== MANUAL_DELIVERY_STATUS.CREATED || doc.driver) {
                return null;
            }
            doc.driver = driverProfileIdParam;
            doc.driverUser = driverUserIdParam;
            doc.driverSnapshot = driverSnapshot;
            doc.status = MANUAL_DELIVERY_STATUS.ACCEPTED;
            doc.assignedAt = new Date();
            doc.acceptedAt = new Date();
            doc.statusHistory.push(statusHistoryEntry);
            doc.assignmentHistory.push(assignmentHistoryEntry);
            storeMap.set(deliveryId.toString(), doc);
            return { ...doc };
        },

        async findDriverHistory(driverProfileIdParam: any, filters: any, pagination: any) {
            let items = Array.from(storeMap.values()).filter(
                (d) =>
                    d.isActive &&
                    d.driver?.toString() === driverProfileIdParam.toString() &&
                    [
                        MANUAL_DELIVERY_STATUS.DELIVERED,
                        MANUAL_DELIVERY_STATUS.FAILED,
                        MANUAL_DELIVERY_STATUS.CANCELLED,
                    ].includes(d.status)
            );
            const total = items.length;
            const page = pagination.page || 1;
            const limit = pagination.limit || 10;
            const start = (page - 1) * limit;
            const deliveries = items.slice(start, start + limit);
            return { deliveries, total };
        },

        async getDriverStats(driverProfileIdParam: any) {
            const items = Array.from(storeMap.values()).filter(
                (d) => d.isActive && d.driver?.toString() === driverProfileIdParam.toString()
            );
            return {
                totalDelivered: items.filter((d) => d.status === MANUAL_DELIVERY_STATUS.DELIVERED).length,
                activeDeliveries: items.filter((d) =>
                    [
                        MANUAL_DELIVERY_STATUS.ACCEPTED,
                        MANUAL_DELIVERY_STATUS.PICKED_UP,
                        MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY,
                        MANUAL_DELIVERY_STATUS.REACHED,
                    ].includes(d.status)
                ).length,
                todayDelivered: items.filter((d) => d.status === MANUAL_DELIVERY_STATUS.DELIVERED).length,
                totalFailed: items.filter((d) => d.status === MANUAL_DELIVERY_STATUS.FAILED).length,
                assignedPendingAcceptance: items.filter((d) => d.status === MANUAL_DELIVERY_STATUS.ASSIGNED).length,
            };
        },
    };

    return { service, storeMap };
}

// =========================================================================
// TEST SUITE
// =========================================================================

test("Manual creation sends the saved customer, reference and store through MSG91", async (t) => {
    const { service, storeMap } = createManualDeliveryTestHarness();
    service.whatsappService = new ManualDeliveryWhatsAppService();
    const config = {
        MSG91_AUTHKEY: "test-key",
        MSG91_WHATSAPP_BASE_URL: "https://example.test/whatsapp/bulk/",
        MSG91_WHATSAPP_NUMBER: "919999999999",
        MSG91_WHATSAPP_TEMPLATE_MANUAL_ORDER_CREATED: "manual_order_created",
        MSG91_WHATSAPP_NAMESPACE_MANUAL_ORDER_CREATED: "6c83fda4_2ac0_43c3_a26a_780e38020061",
    };
    for (const [key, value] of Object.entries(config)) {
        const previous = process.env[key];
        process.env[key] = value;
        t.after(() => {
            if (previous === undefined) delete process.env[key];
            else process.env[key] = previous;
        });
    }
    const calls: any[] = [];
    t.mock.method(axios, "post", async (url: string, payload: any, options: any) => {
        assert.ok(storeMap.size > 0, "Order must be persisted before notifying");
        calls.push(payload);
        assert.equal(url, config.MSG91_WHATSAPP_BASE_URL);
        assert.equal(options.headers.authkey, "test-key");
        return { data: { request_id: "test-request" } };
    });
    for (const mobileNumber of ["9876543210", "919876543210"]) {
        const delivery = await service.createManualDelivery(vendorUserId, {
            customer: { name: " Customer Name ", mobileNumber, countryCode: "+91" },
            dropoff: { addressLine1: "Customer address" },
        });
        const sent = calls.at(-1);
        assert.equal(sent.integrated_number, config.MSG91_WHATSAPP_NUMBER);
        assert.equal(sent.content_type, "template");
        assert.equal(sent.payload.messaging_product, "whatsapp");
        assert.equal(sent.payload.type, "template");
        assert.deepEqual(sent.payload.template, {
            name: "manual_order_created",
            language: { code: "en", policy: "deterministic" },
            namespace: config.MSG91_WHATSAPP_NAMESPACE_MANUAL_ORDER_CREATED,
            to_and_components: [{
                to: ["919876543210"],
                components: {
                    body_1: { type: "text", value: "Customer Name" },
                    body_2: { type: "text", value: delivery.deliveryNumber },
                    body_3: { type: "text", value: "Sharma Kirana Store" },
                },
            }],
        });
    }
    assert.equal(calls.length, 2);

    t.mock.method(axios, "post", async () => { throw new Error("Provider unavailable"); });
    const saved = await service.createManualDelivery(vendorUserId, {
        customer: { name: "Customer Name", mobileNumber: "9876543210" },
        dropoff: { addressLine1: "Customer address" },
    });
    assert.ok(storeMap.has(saved._id));

    const noSend = t.mock.method(axios, "post", async () => { throw new Error("Unexpected send"); });
    service.repo.create = async () => { throw new Error("Database unavailable"); };
    await assert.rejects(service.createManualDelivery(vendorUserId, {
        customer: { name: "Customer Name", mobileNumber: "9876543210" },
        dropoff: { addressLine1: "Customer address" },
    }), /Database unavailable/);
    assert.equal(noSend.mock.callCount(), 0);

    delete process.env.MSG91_WHATSAPP_TEMPLATE_MANUAL_ORDER_CREATED;
    assert.equal(await service.whatsappService.sendCreated(saved), null);
    assert.equal(noSend.mock.callCount(), 0);
});

test("Manual Delivery - Distance service calculates Haversine straight-line distance accurately", async () => {
    const distanceService = new ManualDeliveryDistanceService();

    // Vadodara Alkapuri (22.3072, 73.1812) to Manjalpur (22.2695, 73.2019)
    const pickup = { latitude: 22.3072, longitude: 73.1812 };
    const dropoff = { latitude: 22.2695, longitude: 73.2019 };

    const result = await distanceService.calculateDistance(pickup, dropoff);

    assert.equal(result.calculationMethod, DISTANCE_CALCULATION_METHOD.STRAIGHT_LINE);
    assert.equal(result.provider, "haversine");
    assert.ok(result.valueKm !== null && result.valueKm > 4 && result.valueKm < 6);
    assert.ok(result.valueMeters !== null && result.valueMeters > 4000);
    assert.ok(result.calculatedAt instanceof Date);
});

test("Manual Delivery - Distance service returns null fields when coordinates are missing or invalid", async () => {
    const distanceService = new ManualDeliveryDistanceService();

    const noDropoffResult = await distanceService.calculateDistance(
        { latitude: 22.3072, longitude: 73.1812 },
        null
    );
    assert.equal(noDropoffResult.valueKm, null);
    assert.equal(noDropoffResult.valueMeters, null);
    assert.equal(noDropoffResult.calculationMethod, null);

    const invalidCoordsResult = await distanceService.calculateDistance(
        { latitude: 200, longitude: 73.1812 }, // Lat > 90 is invalid
        { latitude: 22.2695, longitude: 73.2019 }
    );
    assert.equal(invalidCoordsResult.valueKm, null);
});

test("Manual Delivery - Road distance provider fallback mechanism operates gracefully", async () => {
    const distanceService = new ManualDeliveryDistanceService();

    // Mock calculateRoadDistanceMeters to simulate active road provider
    distanceService.calculateRoadDistanceMeters = async () => ({
        meters: 5800,
        provider: "osrm",
    });

    const result = await distanceService.calculateDistance(
        { latitude: 22.3072, longitude: 73.1812 },
        { latitude: 22.2695, longitude: 73.2019 }
    );

    assert.equal(result.calculationMethod, DISTANCE_CALCULATION_METHOD.ROAD);
    assert.equal(result.provider, "osrm");
    assert.equal(result.valueMeters, 5800);
    assert.equal(result.valueKm, 5.8);
});

test("Manual Delivery - Validation schema accepts valid phone-call order payload without products", () => {
    const validPayload = {
        customer: {
            name: "Rahul Sharma",
            mobileNumber: "9876543210",
            countryCode: "+91",
        },
        dropoff: {
            addressLine1: "B-204, Shree Residency",
            addressLine2: "Near Main Road",
            area: "Manjalpur",
            city: "Vadodara",
            state: "Gujarat",
            postalCode: "390011",
            country: "India",
            landmark: "Near Bank of Baroda",
            latitude: 22.2695,
            longitude: 73.2019,
        },
        customerNotes: "Call before reaching. Deliver at the main gate.",
    };

    const parsed = createManualDeliverySchema.safeParse(validPayload);
    assert.equal(parsed.success, true);
});

test("Manual Delivery - Validation schema rejects invalid mobile number and missing address", () => {
    const invalidPayload = {
        customer: {
            name: "R", // Too short
            mobileNumber: "abc123", // Non-numeric
        },
        dropoff: {
            addressLine1: "", // Missing
        },
    };

    const parsed = createManualDeliverySchema.safeParse(invalidPayload);
    assert.equal(parsed.success, false);
});

test("Manual Delivery - Resolves vendor default registered store pickup address snapshot", async () => {
    const { service } = createManualDeliveryTestHarness();

    const pickup = await service.getDefaultPickupAddress(vendorUserId);

    assert.equal(pickup.storeName, "Sharma Kirana Store");
    assert.equal(pickup.addressLine1, "Shop 12, Market Complex");
    assert.equal(pickup.city, "Vadodara");
    assert.equal(pickup.state, "Gujarat");
    assert.equal(pickup.postalCode, "390007");
    assert.equal(pickup.latitude, 22.3072);
    assert.equal(pickup.longitude, 73.1812);
    assert.equal(pickup.isComplete, true);
    assert.equal(pickup.hasCoordinates, true);
});

test("Manual Delivery - Throws error when user without vendor profile requests default pickup", async () => {
    const { service } = createManualDeliveryTestHarness();

    await assert.rejects(
        () => service.getDefaultPickupAddress(otherVendorUserId),
        /Vendor profile not found/
    );
});

test("Manual Delivery - Successfully creates manual delivery with pickup snapshot, distance, and no products", async () => {
    const { service } = createManualDeliveryTestHarness();

    const payload = {
        customer: {
            name: "Anil Kumar",
            mobileNumber: "9876543210",
            countryCode: "+91",
        },
        dropoff: {
            addressLine1: "Flat 402, Royal Enclave",
            area: "Manjalpur",
            city: "Vadodara",
            state: "Gujarat",
            postalCode: "390011",
            landmark: "Behind Reliance Mall",
            latitude: 22.2695,
            longitude: 73.2019,
        },
        customerNotes: "Customer requested urgent delivery before 8 PM.",
    };

    const delivery = await service.createManualDelivery(vendorUserId, payload);

    assert.ok(delivery._id);
    assert.ok(delivery.deliveryNumber.startsWith("MDEL-"));
    assert.equal(delivery.status, MANUAL_DELIVERY_STATUS.CREATED);
    assert.equal(delivery.vendor.toString(), vendorUserId);

    // Verify pickup snapshot is preserved from vendor profile
    assert.equal(delivery.pickup.storeName, "Sharma Kirana Store");
    assert.equal(delivery.pickup.addressLine1, "Shop 12, Market Complex");
    assert.equal(delivery.pickup.latitude, 22.3072);

    // Verify dropoff
    assert.equal(delivery.dropoff.addressLine1, "Flat 402, Royal Enclave");
    assert.equal(delivery.customer.name, "Anil Kumar");
    assert.equal(delivery.customerNotes, "Customer requested urgent delivery before 8 PM.");

    // Verify distance calculated
    assert.ok(delivery.distance.valueKm !== null);
    assert.equal(delivery.distance.calculationMethod, DISTANCE_CALCULATION_METHOD.STRAIGHT_LINE);

    // Verify status history
    assert.equal(delivery.statusHistory.length, 1);
    assert.equal(delivery.statusHistory[0].status, MANUAL_DELIVERY_STATUS.CREATED);

    // Verify no product items exist on the document
    assert.equal((delivery as any).items, undefined);
    assert.equal((delivery as any).products, undefined);
});

test("Manual Delivery - Address-only destination without coordinates creates delivery with null distance", async () => {
    const { service } = createManualDeliveryTestHarness();

    const payload = {
        customer: {
            name: "Pooja Verma",
            mobileNumber: "9876543211",
        },
        dropoff: {
            addressLine1: "House No 5, Near Old Temple",
            area: "Sayajigunj",
            city: "Vadodara",
            state: "Gujarat",
            postalCode: "390002",
            // No coordinates provided
        },
    };

    const delivery = await service.createManualDelivery(vendorUserId, payload);

    assert.ok(delivery._id);
    assert.equal(delivery.distance.valueKm, null);
    assert.equal(delivery.distance.calculationMethod, null);
    assert.equal(delivery.dropoff.addressLine1, "House No 5, Near Old Temple");
});

test("Manual Delivery - Vendor ownership restrictions prevent other vendors from viewing delivery", async () => {
    const { service } = createManualDeliveryTestHarness();

    const delivery = await service.createManualDelivery(vendorUserId, {
        customer: { name: "Test Cust", mobileNumber: "9876543210" },
        dropoff: { addressLine1: "Some address", city: "Vadodara" },
    });

    // Owner vendor can view
    const ownerView = await service.getDeliveryById(delivery._id, vendorUserId);
    assert.equal(ownerView._id, delivery._id);

    // Other vendor is forbidden
    await assert.rejects(
        () => service.getDeliveryById(delivery._id, otherVendorUserId),
        /You are not authorized to view this manual delivery/
    );

    // Admin can view
    const adminView = await service.getDeliveryById(delivery._id, adminUserId);
    assert.equal(adminView._id, delivery._id);
});

test("Manual Delivery - Updating dropoff destination in CREATED status recalculates distance", async () => {
    const { service } = createManualDeliveryTestHarness();

    const delivery = await service.createManualDelivery(vendorUserId, {
        customer: { name: "Test Cust", mobileNumber: "9876543210" },
        dropoff: {
            addressLine1: "Initial address",
            latitude: 22.2695,
            longitude: 73.2019,
        },
    });

    const initialDistanceKm = delivery.distance.valueKm;

    // Update with new dropoff coordinates further away
    const updated = await service.updateDelivery(delivery._id, vendorUserId, {
        dropoff: {
            addressLine1: "Updated address in Chhani",
            latitude: 22.3700,
            longitude: 73.1900,
        },
        customerNotes: "Ring doorbell twice.",
    });

    assert.equal(updated.dropoff.addressLine1, "Updated address in Chhani");
    assert.equal(updated.customerNotes, "Ring doorbell twice.");
    assert.notEqual(updated.distance.valueKm, initialDistanceKm);
});

test("Manual Delivery - Full driver workflow: Assign -> Accept -> Milestones -> Delivered", async () => {
    const { service } = createManualDeliveryTestHarness();

    // 1. Create delivery
    const delivery = await service.createManualDelivery(vendorUserId, {
        customer: { name: "Driver Test Customer", mobileNumber: "9876543210" },
        dropoff: { addressLine1: "123 Main Street", city: "Vadodara" },
    });
    assert.equal(delivery.status, MANUAL_DELIVERY_STATUS.CREATED);

    // 2. Vendor assigns driver
    const assigned = await service.assignDriver(
        delivery._id,
        vendorUserId,
        driverProfileId
    );
    assert.equal(assigned.status, MANUAL_DELIVERY_STATUS.ASSIGNED);
    assert.equal(assigned.driverSnapshot.name, "Vikram Rathore");
    assert.equal(assigned.driverSnapshot.vehicleNumber, "GJ06AB1234");
    assert.ok(assigned.assignedAt instanceof Date);

    // 3. Driver accepts delivery
    const accepted = await service.driverAccept(delivery._id, driverUserId);
    assert.equal(accepted.status, MANUAL_DELIVERY_STATUS.ACCEPTED);
    assert.ok(accepted.acceptedAt instanceof Date);

    // 4. Milestone: PICKED_UP
    const pickedUp = await service.driverUpdateStatus(
        delivery._id,
        driverUserId,
        MANUAL_DELIVERY_STATUS.PICKED_UP,
        "Package collected from store."
    );
    assert.equal(pickedUp.status, MANUAL_DELIVERY_STATUS.PICKED_UP);
    assert.ok(pickedUp.pickedUpAt instanceof Date);

    // 5. Milestone: OUT_FOR_DELIVERY
    const outForDelivery = await service.driverUpdateStatus(
        delivery._id,
        driverUserId,
        MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY
    );
    assert.equal(outForDelivery.status, MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY);
    assert.ok(outForDelivery.outForDeliveryAt instanceof Date);

    // 6. Milestone: REACHED
    const reached = await service.driverUpdateStatus(
        delivery._id,
        driverUserId,
        MANUAL_DELIVERY_STATUS.REACHED
    );
    assert.equal(reached.status, MANUAL_DELIVERY_STATUS.REACHED);
    assert.ok(reached.reachedAt instanceof Date);

    // 7. Milestone: DELIVERED
    const delivered = await service.driverUpdateStatus(
        delivery._id,
        driverUserId,
        MANUAL_DELIVERY_STATUS.DELIVERED,
        "Delivered directly to customer."
    );
    assert.equal(delivered.status, MANUAL_DELIVERY_STATUS.DELIVERED);
    assert.ok(delivered.deliveredAt instanceof Date);
});

test("Manual Delivery - Driver rejection resets status back to CREATED and unassigns driver for reassignment", async () => {
    const { service } = createManualDeliveryTestHarness();

    const delivery = await service.createManualDelivery(vendorUserId, {
        customer: { name: "Rejection Test", mobileNumber: "9876543210" },
        dropoff: { addressLine1: "456 Side Street", city: "Vadodara" },
    });

    // Assign driver 1
    await service.assignDriver(delivery._id, vendorUserId, driverProfileId);

    // Driver 1 rejects assignment
    const rejected = await service.driverReject(
        delivery._id,
        driverUserId,
        "Puncture in tyre"
    );

    // Must reset to CREATED and clear driver
    assert.equal(rejected.status, MANUAL_DELIVERY_STATUS.CREATED);
    assert.equal(rejected.driver, null);
    assert.equal(rejected.driverSnapshot, null);
    assert.equal(rejected.rejectionReason, "Puncture in tyre");

    // History should reflect the rejection
    const lastAssignment = rejected.assignmentHistory[rejected.assignmentHistory.length - 1];
    assert.equal(lastAssignment.action, "REJECTED");
    assert.equal(lastAssignment.reason, "Puncture in tyre");

    // Now reassign to driver 2
    const reassigned = await service.assignDriver(
        delivery._id,
        vendorUserId,
        otherDriverProfileId
    );
    assert.equal(reassigned.status, MANUAL_DELIVERY_STATUS.ASSIGNED);
    assert.equal(reassigned.driverSnapshot.name, "Amit Patel");
});

test("Manual Delivery - Invalid state transitions are strictly rejected", async () => {
    const { service } = createManualDeliveryTestHarness();

    const delivery = await service.createManualDelivery(vendorUserId, {
        customer: { name: "Transition Test", mobileNumber: "9876543210" },
        dropoff: { addressLine1: "Address", city: "Vadodara" },
    });

    await service.assignDriver(delivery._id, vendorUserId, driverProfileId);
    await service.driverAccept(delivery._id, driverUserId);

    // Trying to jump directly from ACCEPTED to DELIVERED without pickup is invalid
    await assert.rejects(
        () =>
            service.driverUpdateStatus(
                delivery._id,
                driverUserId,
                MANUAL_DELIVERY_STATUS.DELIVERED
            ),
        /Invalid status transition/
    );
});

test("Manual Delivery - Cancellation workflow and preventing modification after terminal status", async () => {
    const { service } = createManualDeliveryTestHarness();

    const delivery = await service.createManualDelivery(vendorUserId, {
        customer: { name: "Cancel Test", mobileNumber: "9876543210" },
        dropoff: { addressLine1: "Address", city: "Vadodara" },
    });

    const cancelled = await service.cancelDelivery(
        delivery._id,
        vendorUserId,
        "Customer cancelled phone request"
    );

    assert.equal(cancelled.status, MANUAL_DELIVERY_STATUS.CANCELLED);
    assert.equal(cancelled.cancellationReason, "Customer cancelled phone request");

    // Cannot modify cancelled delivery
    await assert.rejects(
        () =>
            service.updateDelivery(delivery._id, vendorUserId, {
                customerNotes: "Attempted edit",
            }),
        /Delivery cannot be modified/
    );

    // Cannot cancel again
    await assert.rejects(
        () => service.cancelDelivery(delivery._id, vendorUserId),
        /already CANCELLED/
    );
});

test("Manual Delivery - Pagination, status filtering, and search functionality", async () => {
    const { service } = createManualDeliveryTestHarness();

    // Create 3 deliveries
    await service.createManualDelivery(vendorUserId, {
        customer: { name: "Alpha Customer", mobileNumber: "9811111111" },
        dropoff: { addressLine1: "Alpha Road", city: "Vadodara" },
    });

    await service.createManualDelivery(vendorUserId, {
        customer: { name: "Beta Customer", mobileNumber: "9822222222" },
        dropoff: { addressLine1: "Beta Lane", city: "Vadodara" },
    });

    const gamma = await service.createManualDelivery(vendorUserId, {
        customer: { name: "Gamma Customer", mobileNumber: "9833333333" },
        dropoff: { addressLine1: "Gamma Blvd", city: "Vadodara" },
    });

    // Assign gamma to change status
    await service.assignDriver(gamma._id, vendorUserId, driverProfileId);

    // 1. List all for vendor
    const all = await service.listDeliveries(vendorUserId, { page: 1, limit: 10 });
    assert.equal(all.total, 3);

    // 2. Filter by status CREATED
    const createdOnly = await service.listDeliveries(vendorUserId, {
        status: MANUAL_DELIVERY_STATUS.CREATED,
    });
    assert.equal(createdOnly.total, 2);

    // 3. Search by name
    const searchResult = await service.listDeliveries(vendorUserId, {
        search: "beta",
    });
    assert.equal(searchResult.total, 1);
    assert.equal(searchResult.deliveries[0].customer.name, "Beta Customer");

    // 4. Pagination limit 1
    const paged = await service.listDeliveries(vendorUserId, {
        page: 1,
        limit: 1,
    });
    assert.equal(paged.deliveries.length, 1);
    assert.equal(paged.total, 3);
});

// =========================================================================
// NEW TESTS: MAP LINK PARSER & RIDER ACCEPTANCE CANCELLATION GUARD
// =========================================================================

test("Manual Delivery - Map link parser extracts coordinates across Google Maps URL variations", async () => {
    // 1. @lat,lng fragment URL
    const atUrl =
        "https://www.google.com/maps/@12.971598,77.594562,15z";
    const atCoords = await parseMapLinkToCoordinates(atUrl);
    assert.ok(atCoords);
    assert.equal(atCoords?.latitude, 12.971598);
    assert.equal(atCoords?.longitude, 77.594562);

    // 2. Query param q=lat,lng
    const qUrl = "https://maps.google.com/?q=19.076090,72.877426";
    const qCoords = await parseMapLinkToCoordinates(qUrl);
    assert.ok(qCoords);
    assert.equal(qCoords?.latitude, 19.07609);
    assert.equal(qCoords?.longitude, 72.877426);

    // 3. Query param query=lat,lng with encoded comma
    const queryUrl =
        "https://www.google.com/maps/search/?api=1&query=28.704060%2C77.102493";
    const queryCoords = await parseMapLinkToCoordinates(queryUrl);
    assert.ok(queryCoords);
    assert.equal(queryCoords?.latitude, 28.70406);
    assert.equal(queryCoords?.longitude, 77.102493);

    // 4. Destination parameter daddr=lat,lng
    const destUrl = "https://maps.google.com/?daddr=22.307159,73.181219";
    const destCoords = await parseMapLinkToCoordinates(destUrl);
    assert.ok(destCoords);
    assert.equal(destCoords?.latitude, 22.307159);
    assert.equal(destCoords?.longitude, 73.181219);

    // 5. Google Maps place data with !3dlat!4dlng
    const placeDataUrl =
        "https://www.google.com/maps/place/Cubbon+Park/@12.977868,77.592882,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae167768b4440f:0x5e2c56037a34241!8m2!3d12.977868!4d77.592882!16zL20vMDM3eHZw";
    const placeCoords = await parseMapLinkToCoordinates(placeDataUrl);
    assert.ok(placeCoords);
    assert.equal(placeCoords?.latitude, 12.977868);
    assert.equal(placeCoords?.longitude, 77.592882);

    // 6. Path coordinates
    const pathUrl = "https://www.google.com/maps/place/13.082680,80.270718";
    const pathCoords = await parseMapLinkToCoordinates(pathUrl);
    assert.ok(pathCoords);
    assert.equal(pathCoords?.latitude, 13.08268);
    assert.equal(pathCoords?.longitude, 80.270718);

    // 7. Invalid or empty URL
    assert.equal(await parseMapLinkToCoordinates(""), null);
    assert.equal(await parseMapLinkToCoordinates("not-a-map-link"), null);
});

test("Manual Delivery - Creating delivery with mapLink auto-populates dropoff coordinates, GeoJSON Point, and calculates distance", async () => {
    const { service } = createManualDeliveryTestHarness();

    // Map link pointing to Manjalpur, Vadodara (22.2695, 73.2019)
    // Vendor store is at Alkapuri (22.3072, 73.1812)
    const mapLink =
        "https://www.google.com/maps/@22.269500,73.201900,16z";

    const delivery = await service.createManualDelivery(vendorUserId, {
        customer: {
            name: "Rajesh Varma",
            mobileNumber: "9876543210",
        },
        dropoff: {
            addressLine1: "Tower 5, Green Heights",
            area: "Manjalpur",
            city: "Vadodara",
            state: "Gujarat",
            postalCode: "390011",
            mapLink,
        },
    });

    // 1. Latitude and longitude must be populated from mapLink
    assert.equal(delivery.dropoff.latitude, 22.2695);
    assert.equal(delivery.dropoff.longitude, 73.2019);
    assert.equal(delivery.dropoff.mapLink, mapLink);

    // 2. GeoJSON Point location must be created [longitude, latitude]
    assert.ok(delivery.dropoff.location);
    assert.equal(delivery.dropoff.location.type, "Point");
    assert.equal(delivery.dropoff.location.coordinates[0], 73.2019);
    assert.equal(delivery.dropoff.location.coordinates[1], 22.2695);

    // 3. Distance calculation must be automatically triggered
    assert.ok(delivery.distance.valueKm !== null && delivery.distance.valueKm > 4);
    assert.ok(delivery.distance.valueMeters !== null && delivery.distance.valueMeters > 4000);
    assert.equal(
        delivery.distance.calculationMethod,
        DISTANCE_CALCULATION_METHOD.STRAIGHT_LINE
    );
});

test("Manual Delivery - Updating delivery with mapLink updates dropoff coordinates and recalculates distance", async () => {
    const { service } = createManualDeliveryTestHarness();

    // Create initially with no coordinates
    const delivery = await service.createManualDelivery(vendorUserId, {
        customer: {
            name: "Sunil Verma",
            mobileNumber: "9876543210",
        },
        dropoff: {
            addressLine1: "Initial Address Line 1",
            city: "Vadodara",
        },
    });

    assert.equal(delivery.dropoff.latitude, null);
    assert.equal(delivery.distance.valueKm, null);

    // Update with mapLink
    const updatedMapLink =
        "https://maps.google.com/?q=22.269500,73.201900";
    const updated = await service.updateDelivery(delivery._id, vendorUserId, {
        dropoff: {
            mapLink: updatedMapLink,
        },
    });

    assert.equal(updated.dropoff.latitude, 22.2695);
    assert.equal(updated.dropoff.longitude, 73.2019);
    assert.equal(updated.dropoff.location?.type, "Point");
    assert.equal(updated.dropoff.location?.coordinates[0], 73.2019);
    assert.equal(updated.dropoff.location?.coordinates[1], 22.2695);
    assert.ok(updated.distance.valueKm !== null && updated.distance.valueKm > 4);
});

test("Manual Delivery - Rider acceptance cancellation guard strictly disallows cancellation after rider acceptance", async () => {
    const { service } = createManualDeliveryTestHarness();

    const delivery = await service.createManualDelivery(vendorUserId, {
        customer: {
            name: "Cancellation Guard Test",
            mobileNumber: "9876543210",
        },
        dropoff: {
            addressLine1: "123 Main St",
            city: "Vadodara",
        },
    });

    // 1. In CREATED status, cancellation is allowed
    // (create a new delivery to test ACCEPTED status specifically)
    const activeDelivery = await service.createManualDelivery(vendorUserId, {
        customer: {
            name: "Guard Delivery 2",
            mobileNumber: "9876543211",
        },
        dropoff: {
            addressLine1: "456 Market St",
            city: "Vadodara",
        },
    });

    // Assign driver -> status: ASSIGNED
    await service.assignDriver(
        activeDelivery._id,
        vendorUserId,
        driverProfileId
    );

    // Driver accepts assignment -> status: ACCEPTED, acceptedAt set
    await service.driverAccept(activeDelivery._id, driverUserId);

    // Vendor or Admin attempts to cancel order after rider accepted:
    // MUST throw error with message "Once accepted by the rider, cancellation is not allowed."
    await assert.rejects(
        () =>
            service.cancelDelivery(
                activeDelivery._id,
                vendorUserId,
                "Vendor trying to cancel after acceptance"
            ),
        {
            name: "BadRequestException",
            message: "Once accepted by the rider, cancellation is not allowed.",
        }
    );
});

test("Manual Delivery - Driver sees available orders, views details, takes order directly, and push notification triggers", async () => {
    const { service } = createManualDeliveryTestHarness();

    // Vendor creates a manual delivery order -> triggers push broadcast to drivers
    const created = await service.createManualDelivery(vendorUserId, {
        customer: {
            name: "Ananya Roy",
            mobileNumber: "9123456780",
        },
        dropoff: {
            addressLine1: "Flat 402, Sunshine Apartments",
            city: "Vadodara",
        },
    });

    assert.equal(created.status, MANUAL_DELIVERY_STATUS.CREATED);
    assert.ok(!created.driver);
    // Verified push notification was queued for drivers
    assert.equal(service.notificationService.broadcasts.length, 1);
    assert.equal(service.notificationService.broadcasts[0].deliveryNumber, created.deliveryNumber);

    // Driver fetches available orders
    const available = await service.listAvailableDeliveries(driverUserId, {});
    assert.equal(available.total, 1);
    assert.equal(available.deliveries[0].deliveryNumber, created.deliveryNumber);

    // Driver views available order details BEFORE taking it (should NOT throw 403!)
    const details = await service.getDriverDeliveryById(created._id, driverUserId);
    assert.equal(details.deliveryNumber, created.deliveryNumber);

    // Driver directly takes order from available pool (mirrors vendor orders takeOrder)
    const taken = await service.driverTake(created._id, driverUserId);
    assert.equal(taken.status, MANUAL_DELIVERY_STATUS.ACCEPTED);
    assert.equal(taken.driver.toString(), driverProfileId.toString());
    assert.ok(taken.acceptedAt);
    assert.equal(taken.driverSnapshot.name, "Vikram Rathore");

    // Once taken, order is no longer in available pool
    const availableAfter = await service.listAvailableDeliveries(driverUserId, {});
    assert.equal(availableAfter.total, 0);

    // Another driver concurrently attempting to take the same order receives 409 error
    await assert.rejects(
        () => service.driverTake(created._id, otherDriverUserId),
        /already been taken by another driver/
    );

    // Driver completes milestones -> DELIVERED
    await service.driverUpdateStatus(created._id, driverUserId, MANUAL_DELIVERY_STATUS.PICKED_UP);
    await service.driverUpdateStatus(created._id, driverUserId, MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY);
    await service.driverUpdateStatus(created._id, driverUserId, MANUAL_DELIVERY_STATUS.REACHED);
    await service.driverUpdateStatus(created._id, driverUserId, MANUAL_DELIVERY_STATUS.DELIVERED);

    // Driver history now reflects the completed delivery
    const history = await service.listDriverHistory(driverUserId, {});
    assert.equal(history.total, 1);
    assert.equal(history.deliveries[0].status, MANUAL_DELIVERY_STATUS.DELIVERED);

    // Driver stats reflect 1 delivered delivery
    const stats = await service.getDriverStats(driverUserId);
    assert.equal(stats.totalDelivered, 1);
    assert.equal(stats.activeDeliveries, 0);
});

