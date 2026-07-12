import { PersonalShopperRepository } from "../repositories/personalshopper.repository.js";
import { ShopperPhotoRepository } from "../repositories/personalshopperphoto.repository.js";
import { emitRideRequest, emitRideTaken } from "../../../config/socket.js";
import {
    computeEstimate,
    generateBookingNumber,
    haversineKm,
    pointAlongRoute,
    projectOntoRoute,
} from "../utils/personalshopper.util.js";
import { PS_PRICING, PS_ESTIMATION, PS_MAX_STORES, PS_TRACKING } from "../constants/personalshopper.constants.js";
import type {
    IGeoPoint,
    IShopperStore,
    ShoppingAssistance,
} from "../interfaces/personalshopper.interface.js";

interface EstimateInput {
    stores: { location: IGeoPoint;[k: string]: any }[];
    deliveryLocation: IGeoPoint;
    origin?: IGeoPoint;
}

interface CreateInput {
    stores: {
        storeName?: string;
        location: IGeoPoint;
        itemsToBuy: string;
        image?: string;
    }[];
    delivery: {
        mobileNumber: string;
        location: IGeoPoint;
        [k: string]: any;
    };
    shoppingAssistance: ShoppingAssistance;
    origin?: IGeoPoint;
}

export class PersonalShopperService {
    private repo = new PersonalShopperRepository();
    private photoRepo = new ShopperPhotoRepository();

    /** Static policy for the info/pricing screens. */
    getPricingPolicy() {
        return {
            firstBlockMinutes: PS_PRICING.FIRST_BLOCK_MINUTES,
            firstBlockRate: PS_PRICING.FIRST_BLOCK_RATE,
            additionalBlockMinutes: PS_PRICING.ADDITIONAL_BLOCK_MINUTES,
            additionalBlockRate: PS_PRICING.ADDITIONAL_BLOCK_RATE,
            perStoreShoppingMinutes: PS_ESTIMATION.PER_STORE_SHOPPING_MINUTES,
            maxStores: PS_MAX_STORES,
            notes: [
                "Product cost is charged separately based on the actual store bill.",
                "If the actual fee is lower, the difference will be automatically refunded.",
                "Additional transportation/travel charges are shown for approval before proceeding.",
            ],
        };
    }

    /** Estimate time + fee for the preview screen (no persistence). */
    estimate(input: EstimateInput) {
        const stores = input.stores.map((s, i) => ({
            sequence: i + 1,
            location: s.location,
            itemsToBuy: s.itemsToBuy ?? "",
        })) as IShopperStore[];

        const { estimate, storesWithLegs } = computeEstimate(
            stores,
            input.deliveryLocation,
            input.origin
        );

        return {
            estimate,
            stores: storesWithLegs.map((s) => ({
                sequence: s.sequence,
                distanceFromPrevKm: s.distanceFromPrevKm,
            })),
        };
    }

    async create(userId: string, input: CreateInput) {
        const stores: IShopperStore[] = input.stores.map((s, i) => {
            const store: IShopperStore = {
                sequence: i + 1,
                location: s.location,
                itemsToBuy: s.itemsToBuy,
            };
            if (s.storeName !== undefined) store.storeName = s.storeName;
            if (s.image !== undefined) store.image = s.image;
            return store;
        });

        const { estimate, storesWithLegs } = computeEstimate(
            stores,
            input.delivery.location,
            input.origin
        );

        const bookingNumber = await generateBookingNumber();

        return this.repo.create({
            user: userId as any,
            bookingNumber,
            stores: storesWithLegs,
            delivery: input.delivery as any,
            shoppingAssistance: input.shoppingAssistance,
            estimate,
        });
    }

    async getById(id: string, userId: string) {
        const booking = await this.repo.findById(id);
        if (!booking) throw new Error("Booking not found");

        // ownership: the customer, or the assigned rider
        if (!this.canAccess(booking, userId)) throw new Error("Booking not found");

        return booking;
    }

    private canAccess(booking: any, userId: string): boolean {
        const owns = booking.user?._id?.toString() === userId;
        const isDriver = booking.driver?._id
            ? booking.driver._id.toString() === userId
            : booking.driver?.toString() === userId;
        return owns || isDriver;
    }

    private async buildRider(booking: any, driverProfile?: any) {
        if (!booking.driver) return null;
        const dp =
            driverProfile ||
            (await this.repo.getDriverProfileByUser(
                booking.driver._id || booking.driver
            ));
        if (!dp) return null;
        const u: any = dp.user || {};
        return {
            id: u._id,
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
            mobileNumber: u.mobileNumber,
            vehicleType: dp.vehicleType,
            vehicleNumber: dp.vehicleNumber,
            profileImage: dp.profileImage || "",
        };
    }

    /**
     * Builds the ordered route (rider → shops → customer) and the rider's
     * current position/phase from the elapsed movement clock.
     */
    private movement(booking: any) {
        const start = booking.riderStartLocation;
        const stores = (booking.stores || []).map((s: any) => ({
            name: s.storeName || "Store",
            location: { lat: s.location.lat, lng: s.location.lng },
        }));
        const customer = booking.delivery.location;

        const waypoints = [start, ...stores.map((s: any) => s.location), customer];

        const elapsed = (Date.now() - new Date(booking.deliveryStartedAt).getTime()) / 1000;
        const fraction = Math.min(1, Math.max(0, elapsed / PS_TRACKING.ROUTE_DURATION_SECONDS));

        const rp = pointAlongRoute(waypoints, fraction);

        const storeCount = stores.length;
        let phase: string;
        let target: any;
        if (fraction >= 1) {
            phase = "delivered";
            target = { type: "customer", location: customer };
        } else if (rp.legIndex < storeCount) {
            // leg i (0-based) heads to stores[i]
            phase = "heading_to_store";
            target = { type: "store", name: stores[rp.legIndex].name, location: stores[rp.legIndex].location };
        } else {
            phase = "returning_to_customer";
            target = { type: "customer", location: customer };
        }

        return { rp, phase, target, start, stores, customer, fraction };
    }

    /**
     * Poll endpoint. Advances the state machine and returns
     * { status, message, rider, currentTarget }. UI calls this every few seconds.
     */
    async track(id: string, userId: string) {
        const booking: any = await this.repo.findById(id);
        if (!booking) throw new Error("Booking not found");
        if (!this.canAccess(booking, userId)) throw new Error("Booking not found");

        if (booking.paymentStatus !== "paid") {
            return this.trackResponse(booking, "Awaiting payment");
        }

        // confirmed / shopping -> open the request to riders (broadcast), no auto-assign
        if (booking.status === "confirmed" || booking.status === "shopping") {
            booking.status = "finding_rider";
            booking.findingRiderSince = new Date();
            await booking.save();
            emitRideRequest(this.riderSummary(booking)); // notify connected riders
            return this.trackResponse(booking, "Finding a shopper for you…");
        }

        // finding_rider -> wait for a rider to ACCEPT (no automatic assignment)
        if (booking.status === "finding_rider") {
            return this.trackResponse(booking, "Finding a shopper for you…");
        }

        // moving: rider_assigned / heading_to_store / returning_to_customer
        if (
            ["rider_assigned", "heading_to_store", "returning_to_customer"].includes(
                booking.status
            )
        ) {
            const m = this.movement(booking);
            if (m.phase === "delivered") {
                booking.status = "delivered";
                booking.deliveredAt = new Date();
                await booking.save();
                return this.trackResponse(booking, "Delivered");
            }
            booking.status = m.phase;
            await booking.save();
            const msg =
                m.phase === "heading_to_store"
                    ? `Rider is heading to ${m.target.name}`
                    : "Rider is on the way to you";
            return this.trackResponse(booking, msg, undefined, { currentTarget: m.target });
        }

        return this.trackResponse(
            booking,
            booking.status === "delivered" ? "Delivered" : booking.status
        );
    }

    private async trackResponse(
        booking: any,
        message: string,
        driverProfile?: any,
        extra?: Record<string, any>
    ) {
        return {
            bookingId: booking._id,
            status: booking.status,
            message,
            rider: await this.buildRider(booking, driverProfile),
            ...(extra || {}),
        };
    }

    /**
     * Rider app pushes its real GPS coordinates for a booking (prod).
     * Once set, /rider-location returns these instead of the simulated position.
     */
    async pushRiderLocation(id: string, userId: string, lat: number, lng: number) {
        const booking: any = await this.repo.findById(id);
        if (!booking) throw new Error("Booking not found");
        if (!this.isAssignedRider(booking, userId)) {
            throw new Error("Only the assigned rider can push location");
        }
        if (typeof lat !== "number" || typeof lng !== "number") {
            throw new Error("lat and lng are required numbers");
        }

        await this.repo.updateById(id, {
            riderLiveLocation: { lat, lng } as any,
            riderLocationUpdatedAt: new Date() as any,
        });
        // keep the driver's profile location fresh too
        await this.repo.updateDriverLocation(
            booking.driver._id || booking.driver,
            lng,
            lat
        );
        return { ok: true };
    }

    /**
     * Rider's current coordinates along rider → shops → customer.
     * Uses the REAL pushed coordinates when available (prod); otherwise falls
     * back to the time-based simulation (dev, when PS_SIMULATE_RIDER=true).
     */
    async riderLocation(id: string, userId: string) {
        const booking: any = await this.repo.findById(id);
        if (!booking) throw new Error("Booking not found");
        if (!this.canAccess(booking, userId)) throw new Error("Booking not found");

        if (!booking.driver || !booking.riderStartLocation || !booking.deliveryStartedAt) {
            throw new Error("Rider not assigned yet");
        }

        const round = (n: number) => Math.round(n * 1e6) / 1e6;
        const round2 = (n: number) => Math.round(n * 100) / 100;

        const start = booking.riderStartLocation;
        const stores = (booking.stores || []).map((s: any) => ({
            name: s.storeName || "Store",
            location: { lat: s.location.lat, lng: s.location.lng },
        }));
        const customer = booking.delivery.location;
        const waypoints = [start, ...stores.map((s: any) => s.location), customer];

        let source: "live" | "simulated" | "awaiting";
        let location: any;
        let fraction: number;
        let legIndex: number;
        let totalKm: number;

        if (booking.riderLiveLocation) {
            // PROD: real coordinates from the rider app
            source = "live";
            location = { lat: booking.riderLiveLocation.lat, lng: booking.riderLiveLocation.lng };
            const proj = projectOntoRoute(waypoints, location);
            totalKm = proj.totalKm;
            fraction = totalKm > 0 ? Math.min(1, proj.distanceAlongKm / totalKm) : 1;
            legIndex = proj.legIndex;
        } else if (process.env.PS_SIMULATE_RIDER === "true") {
            // DEV: simulate movement along the route
            source = "simulated";
            const m = this.movement(booking);
            location = m.rp.point;
            fraction = m.fraction;
            legIndex = m.rp.legIndex;
            totalKm = m.rp.totalKm;
        } else {
            // PROD with no push yet: hold at the rider's start
            source = "awaiting";
            location = start;
            const proj = projectOntoRoute(waypoints, start);
            totalKm = proj.totalKm;
            fraction = 0;
            legIndex = 0;
        }

        const storeCount = stores.length;
        let target: any;
        if (fraction >= 1) target = { type: "customer", location: customer };
        else if (legIndex < storeCount)
            target = { type: "store", name: stores[legIndex].name, location: stores[legIndex].location };
        else target = { type: "customer", location: customer };

        const remainingKm = Math.max(0, (1 - fraction) * totalKm);
        const etaSeconds =
            source === "simulated"
                ? Math.max(0, Math.round(PS_TRACKING.ROUTE_DURATION_SECONDS * (1 - fraction)))
                : Math.round((remainingKm / PS_TRACKING.LIVE_AVG_SPEED_KMPH) * 3600);

        return {
            source,
            status: fraction >= 1 ? "delivered" : booking.status,
            location: { lat: round(location.lat), lng: round(location.lng) },
            currentTarget: target,
            route: { start, stores, customer },
            progress: Math.round(fraction * 100),
            totalKm: round2(totalKm),
            remainingKm: round2(remainingKm),
            etaSeconds,
            arrived: fraction >= 1,
            updatedAt: booking.riderLocationUpdatedAt || null,
        };
    }

    async getMyBookings(userId: string, page = 1, limit = 10, status?: string) {
        return this.repo.findByUser(userId, page, limit, status);
    }

    /** Rider-facing summary of a booking (used for jobs, open requests, broadcasts). */
    private riderSummary(b: any) {
        const u: any = b.user || {};
        return {
            bookingId: b._id,
            bookingNumber: b.bookingNumber,
            status: b.status,
            customer: {
                name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
                mobileNumber: u.mobileNumber,
            },
            delivery: b.delivery,
            stores: (b.stores || []).map((s: any) => ({
                storeId: s._id,
                storeName: s.storeName,
                itemsToBuy: s.itemsToBuy,
                location: s.location,
            })),
            shopperFee: b.estimate?.shopperFee,
            driverAssignedAt: b.driverAssignedAt,
        };
    }

    /**
     * Rider's assigned jobs (poll this to discover the bookingId).
     * scope "active" (default) = in-progress deliveries; "all" = incl. delivered.
     */
    async getRiderBookings(userId: string, scope: "active" | "all" = "active") {
        const active = ["rider_assigned", "heading_to_store", "returning_to_customer"];
        const statuses = scope === "all" ? undefined : active;
        const bookings = await this.repo.findByDriver(userId, statuses);
        return bookings.map((b: any) => this.riderSummary(b));
    }

    /** Open (unassigned) shopper requests a rider can accept — empty if they're busy. */
    async getOpenRequests(userId: string) {
        const busy = await this.repo.isRiderBusy(userId);
        if (busy) return { busy: true, requests: [] };
        const bookings = await this.repo.findOpenRequests();
        return { busy: false, requests: bookings.map((b: any) => this.riderSummary(b)) };
    }

    /** Rider accepts a request. First-wins + busy-rider check. */
    async acceptBooking(bookingId: string, userId: string) {
        if (await this.repo.isRiderBusy(userId)) {
            throw new Error("You already have an active job");
        }
        const dp: any = await this.repo.getDriverProfileByUser(userId);
        const coords = dp?.currentLocation?.coordinates || [0, 0];
        const riderStart = { lat: coords[1], lng: coords[0] };

        const booking = await this.repo.acceptBookingAtomic(bookingId, userId, riderStart);
        if (!booking) throw new Error("Request already taken or not open");

        emitRideTaken(bookingId);
        return this.riderSummary(booking);
    }

    private isAssignedRider(booking: any, userId: string): boolean {
        if (!booking.driver) return false;
        const id = booking.driver._id
            ? booking.driver._id.toString()
            : booking.driver.toString();
        return id === userId;
    }

    // ---- Shopper photos ----

    /**
     * Rider sends a photo during shopping. `type` = info | approval | payment
     * (drives the customer's action buttons). Back-compat: `requiresApproval`
     * true maps to the "approval" type.
     */
    async addPhoto(
        bookingId: string,
        userId: string,
        data: {
            imageUrl: string;
            caption?: string;
            type?: "info" | "approval" | "payment";
            requiresApproval?: boolean;
            storeId?: string;
        }
    ) {
        const booking: any = await this.repo.findById(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (!this.isAssignedRider(booking, userId)) {
            throw new Error("Only the assigned rider can add photos");
        }
        if (!data.imageUrl) throw new Error("imageUrl is required");

        // resolve type (explicit `type` wins; else legacy `requiresApproval`)
        let type: "info" | "approval" | "payment" = "info";
        if (data.type && ["info", "approval", "payment"].includes(data.type)) {
            type = data.type;
        } else if (data.requiresApproval) {
            type = "approval";
        }
        const status = type === "info" ? "none" : "pending";

        // optional store snapshot
        let storeName = "";
        if (data.storeId) {
            const s = (booking.stores || []).find(
                (x: any) => x._id?.toString() === data.storeId
            );
            if (s) storeName = s.storeName || "";
        }

        const riderId = booking.driver._id || booking.driver;

        const created = await this.photoRepo.create({
            booking: booking._id,
            rider: riderId,
            imageUrl: data.imageUrl,
            caption: data.caption || "",
            ...(data.storeId ? { storeId: data.storeId as any } : {}),
            storeName,
            type,
            status,
        });
        return this.decoratePhoto(created);
    }

    /** Add back-compat aliases so older UI keeps working. */
    private decoratePhoto(p: any) {
        const o = typeof p.toObject === "function" ? p.toObject() : p;
        return {
            ...o,
            requiresApproval: o.type !== "info",
            approvalStatus: o.status, // legacy alias
        };
    }

    /** Photos for a booking (customer or rider). */
    async getPhotos(bookingId: string, userId: string) {
        const booking: any = await this.repo.findById(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (!this.canAccess(booking, userId)) throw new Error("Booking not found");

        const [photos, pendingActions] = await Promise.all([
            this.photoRepo.findByBooking(bookingId),
            this.photoRepo.pendingCount(bookingId),
        ]);
        return {
            photos: photos.map((p) => this.decoratePhoto(p)),
            pendingActions,
            pendingApprovals: pendingActions, // legacy alias
        };
    }

    /**
     * Customer responds to a photo. Valid actions depend on the photo type:
     *   approval -> approve | reject   (=> approved | rejected)
     *   payment  -> paid | deny        (=> paid | denied)
     */
    async respondPhoto(
        photoId: string,
        userId: string,
        action: "approve" | "reject" | "paid" | "deny",
        remark?: string
    ) {
        const photo: any = await this.photoRepo.findById(photoId);
        if (!photo) throw new Error("Photo not found");

        const booking: any = await this.repo.findById(photo.booking.toString());
        if (!booking) throw new Error("Booking not found");

        // only the customer (booking owner) can respond
        if (booking.user?._id?.toString() !== userId) {
            throw new Error("Not allowed");
        }
        if (photo.type === "info") {
            throw new Error("This photo does not need a response");
        }
        if (photo.status !== "pending") {
            throw new Error(`Photo already ${photo.status}`);
        }

        const map: Record<string, { types: string[]; status: string }> = {
            approve: { types: ["approval"], status: "approved" },
            reject: { types: ["approval"], status: "rejected" },
            paid: { types: ["payment"], status: "paid" },
            deny: { types: ["payment"], status: "denied" },
        };
        const rule = map[action];
        if (!rule) throw new Error("Invalid action");
        if (!rule.types.includes(photo.type)) {
            throw new Error(`Action "${action}" is not valid for a ${photo.type} photo`);
        }

        const updated = await this.photoRepo.updateById(photoId, {
            status: rule.status as any,
            customerRemark: remark || "",
            respondedAt: new Date(),
        });
        return this.decoratePhoto(updated);
    }

    async cancel(id: string, userId: string) {
        const booking = await this.repo.findById(id);
        if (!booking) throw new Error("Booking not found");
        if (booking.user?._id?.toString() !== userId) {
            throw new Error("Booking not found");
        }
        if (["delivered", "cancelled"].includes(booking.status)) {
            throw new Error(`Cannot cancel a ${booking.status} booking`);
        }

        return this.repo.updateById(id, {
            status: "cancelled",
            cancelledAt: new Date(),
        });
    }
}
