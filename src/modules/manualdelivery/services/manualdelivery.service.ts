import { Types } from "mongoose";
import { ManualDeliveryRepository } from "../repositories/manualdelivery.repository.js";
import { ManualDeliveryDistanceService } from "./manualdelivery-distance.service.js";
import { ManualDeliveryMapLinkService } from "./manualdelivery-maplink.service.js";
import { ManualDeliveryWhatsAppService } from "./manualdelivery-whatsapp.service.js";
import { ManualDeliveryNotificationService } from "./manualdelivery-notification.service.js";
import { AppError, BadRequestException } from "../../../utils/appError.js";
import {
    MANUAL_DELIVERY_STATUS,
    MANUAL_DELIVERY_SOURCE,
    STATUS_DISPLAY_TITLES,
    TERMINAL_STATUSES,
    EDITABLE_STATUSES,
    type ManualDeliveryStatus,
} from "../constants/manualdelivery.constants.js";
import type {
    IManualDelivery,
    IManualDeliveryFilter,
    IPaginationOptions,
} from "../interfaces/manualdelivery.interface.js";

export class ManualDeliveryService {
    private repo = new ManualDeliveryRepository();
    private distanceService = new ManualDeliveryDistanceService();
    private mapLinkService = new ManualDeliveryMapLinkService();
    private whatsappService = new ManualDeliveryWhatsAppService();
    private notificationService = new ManualDeliveryNotificationService();

    /**
     * Checks if a user has admin privileges.
     */
    private isUserAdmin(user: any): boolean {
        if (!user) return false;
        return (
            user.role === "admin" ||
            (Array.isArray(user.roles) && user.roles.includes("admin"))
        );
    }

    /**
     * Extracts coordinates from address fields or geoPoint.
     */
    private extractCoordinates(address: any): {
        latitude: number | null;
        longitude: number | null;
    } {
        let lat: number | null = null;
        let lng: number | null = null;

        if (typeof address?.latitude === "number") {
            lat = address.latitude;
        }
        if (typeof address?.longitude === "number") {
            lng = address.longitude;
        }

        // If coordinates array exists: [lng, lat]
        if (
            (lat === null || lng === null) &&
            Array.isArray(address?.location?.coordinates) &&
            address.location.coordinates.length === 2
        ) {
            lng = address.location.coordinates[0];
            lat = address.location.coordinates[1];
        }

        if (this.distanceService.isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
        }

        return { latitude: null, longitude: null };
    }

    /**
     * Fetches the authenticated vendor's registered store pickup address.
     */
    async getDefaultPickupAddress(userId: string) {
        if (!userId) {
            throw new AppError("Authentication required", 401);
        }

        const vendorProfile = await this.repo.findVendorProfileByUserId(userId);
        if (!vendorProfile) {
            throw new AppError(
                "Vendor profile not found for this user account",
                404
            );
        }

        const storeAddress = vendorProfile.storeLocationAddress;
        if (!storeAddress) {
            throw new AppError(
                "No registered store address found on your vendor profile",
                400
            );
        }

        const coords = this.extractCoordinates(storeAddress);
        const isComplete = Boolean(
            storeAddress.addressLine1 &&
            storeAddress.city &&
            storeAddress.state &&
            storeAddress.postalCode
        );

        return {
            vendorId: vendorProfile.user,
            vendorProfileId: vendorProfile._id,
            storeName: vendorProfile.storeName,
            addressLine1: storeAddress.addressLine1 || "",
            addressLine2: storeAddress.addressLine2 || "",
            area: (storeAddress as any).area || "",
            city: storeAddress.city || "",
            state: storeAddress.state || "",
            postalCode: storeAddress.postalCode || "",
            country: storeAddress.country || "India",
            landmark: storeAddress.landmark || "",
            latitude: coords.latitude,
            longitude: coords.longitude,
            formattedAddress: [
                storeAddress.addressLine1,
                storeAddress.addressLine2,
                storeAddress.city,
                storeAddress.state,
                storeAddress.postalCode,
            ]
                .filter(Boolean)
                .join(", "),
            isComplete,
            hasCoordinates: coords.latitude !== null && coords.longitude !== null,
            warnings:
                coords.latitude === null || coords.longitude === null
                    ? [
                        "Store latitude and longitude are not set. Distance calculation will require manual coordinates or geocoding.",
                    ]
                    : [],
        };
    }

    /**
     * Previews distance calculation for given or vendor pickup coordinates and destination coordinates.
     */
    async calculateDistancePreview(
        userId: string,
        payload: {
            pickup?: { latitude: number; longitude: number };
            dropoff: {
                latitude?: number;
                longitude?: number;
                mapLink?: string;
            };
        }
    ) {
        let pickupCoords = payload.pickup;

        // Auto-resolve pickup from vendor store if not explicitly passed
        if (!pickupCoords || !this.distanceService.isValidCoordinate(pickupCoords.latitude, pickupCoords.longitude)) {
            const store = await this.getDefaultPickupAddress(userId);
            if (store.hasCoordinates && store.latitude && store.longitude) {
                pickupCoords = {
                    latitude: store.latitude,
                    longitude: store.longitude,
                };
            }
        }

        let dropoffCoords = {
            latitude: payload.dropoff.latitude,
            longitude: payload.dropoff.longitude,
        };

        if (
            !this.distanceService.isValidCoordinate(
                dropoffCoords.latitude,
                dropoffCoords.longitude
            ) &&
            payload.dropoff.mapLink?.trim()
        ) {
            const parsed = await this.mapLinkService.parseMapLinkToCoordinates(
                payload.dropoff.mapLink.trim()
            );
            if (parsed) {
                dropoffCoords = parsed;
            }
        }

        return this.distanceService.calculateDistance(
            pickupCoords,
            dropoffCoords
        );
    }

    /**
     * Creates a new manual delivery request.
     */
    async createManualDelivery(
        userId: string,
        payload: {
            customer: {
                name: string;
                mobileNumber: string;
                countryCode?: string;
                customerId?: string | null;
            };
            dropoff: {
                addressLine1: string;
                addressLine2?: string;
                area?: string;
                city?: string;
                state?: string;
                postalCode?: string;
                country?: string;
                landmark?: string;
                latitude?: number | null;
                longitude?: number | null;
                formattedAddress?: string;
                mapLink?: string | null;
            };
            customerNotes?: string;
            vendorId?: string;
        }
    ) {
        const user = await this.repo.findUserById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const isAdmin = this.isUserAdmin(user);

        // Determine target vendor (admin can act on behalf of specific vendorId)
        let targetVendorUserId = userId;
        if (isAdmin && payload.vendorId) {
            targetVendorUserId = payload.vendorId;
        }

        // Fetch vendor profile
        const vendorProfile = await this.repo.findVendorProfileByUserId(
            targetVendorUserId
        );
        if (!vendorProfile) {
            throw new AppError(
                "Registered vendor profile not found. A valid vendor profile with store address is required.",
                400
            );
        }

        const storeAddress = vendorProfile.storeLocationAddress;
        if (
            !storeAddress ||
            !storeAddress.addressLine1 ||
            !storeAddress.city ||
            !storeAddress.state ||
            !storeAddress.postalCode
        ) {
            throw new AppError(
                "Vendor store address is incomplete. Please ensure address line, city, state, and postal code are set in the vendor profile.",
                400
            );
        }

        // Snapshot pickup address
        const pickupCoords = this.extractCoordinates(storeAddress);
        const formattedPickup = [
            storeAddress.addressLine1,
            storeAddress.addressLine2,
            storeAddress.city,
            storeAddress.state,
            storeAddress.postalCode,
        ]
            .filter(Boolean)
            .join(", ");

        const pickupSnapshot: any = {
            vendorId: new Types.ObjectId(targetVendorUserId),
            vendorProfileId: vendorProfile._id,
            storeName: vendorProfile.storeName,
            contactName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
            contactPhone: user.mobileNumber || undefined,
            addressLine1: storeAddress.addressLine1,
            addressLine2: storeAddress.addressLine2 || "",
            area: (storeAddress as any).area || "",
            city: storeAddress.city,
            state: storeAddress.state,
            postalCode: storeAddress.postalCode,
            country: storeAddress.country || "India",
            landmark: storeAddress.landmark || "",
            latitude: pickupCoords.latitude,
            longitude: pickupCoords.longitude,
            formattedAddress: formattedPickup,
        };

        if (
            pickupCoords.latitude !== null &&
            pickupCoords.longitude !== null
        ) {
            pickupSnapshot.location = {
                type: "Point",
                coordinates: [pickupCoords.longitude, pickupCoords.latitude],
            };
        }

        // Parse map link if provided to resolve dropoff coordinates
        const mapLink = payload.dropoff.mapLink?.trim() || null;
        let mapLinkCoords: { latitude: number; longitude: number } | null = null;
        if (mapLink) {
            try {
                mapLinkCoords =
                    await this.mapLinkService.parseMapLinkToCoordinates(mapLink);
            } catch {
                // Silently fallback if network issue or unparseable
            }
        }

        const rawDropoffCoords = this.extractCoordinates(payload.dropoff);
        const dropoffCoords = {
            latitude: mapLinkCoords?.latitude ?? rawDropoffCoords.latitude,
            longitude: mapLinkCoords?.longitude ?? rawDropoffCoords.longitude,
        };

        const formattedDropoff =
            payload.dropoff.formattedAddress ||
            [
                payload.dropoff.addressLine1,
                payload.dropoff.addressLine2,
                payload.dropoff.area,
                payload.dropoff.city,
                payload.dropoff.state,
                payload.dropoff.postalCode,
            ]
                .filter(Boolean)
                .join(", ");

        const dropoffSnapshot: any = {
            addressLine1: payload.dropoff.addressLine1.trim(),
            addressLine2: payload.dropoff.addressLine2?.trim() || "",
            area: payload.dropoff.area?.trim() || "",
            city: payload.dropoff.city?.trim() || storeAddress.city,
            state: payload.dropoff.state?.trim() || storeAddress.state,
            postalCode: payload.dropoff.postalCode?.trim() || "",
            country: payload.dropoff.country?.trim() || "India",
            landmark: payload.dropoff.landmark?.trim() || "",
            latitude: dropoffCoords.latitude,
            longitude: dropoffCoords.longitude,
            formattedAddress: formattedDropoff,
            mapLink: mapLink,
        };

        if (
            dropoffCoords.latitude !== null &&
            dropoffCoords.longitude !== null &&
            this.distanceService.isValidCoordinate(
                dropoffCoords.latitude,
                dropoffCoords.longitude
            )
        ) {
            dropoffSnapshot.location = {
                type: "Point",
                coordinates: [dropoffCoords.longitude, dropoffCoords.latitude],
            };
        }

        // Calculate distance
        const distance = await this.distanceService.calculateDistance(
            pickupCoords,
            dropoffCoords
        );

        // Generate unique delivery reference number
        const deliveryNumber = await this.repo.generateDeliveryNumber();

        // Status history entry
        const statusHistoryEntry = {
            status: MANUAL_DELIVERY_STATUS.CREATED,
            title: STATUS_DISPLAY_TITLES.CREATED,
            remark: "Manual delivery request created from phone call order.",
            updatedBy: new Types.ObjectId(userId),
            updatedByRole: isAdmin ? "admin" : "vendor",
            updatedAt: new Date(),
        };

        // Create document
        const createPayload: Partial<IManualDelivery> = {
            deliveryNumber,
            vendor: new Types.ObjectId(targetVendorUserId),
            vendorProfile: vendorProfile._id as Types.ObjectId,
            createdBy: new Types.ObjectId(userId),
            source: MANUAL_DELIVERY_SOURCE.PHONE_CALL,
            status: MANUAL_DELIVERY_STATUS.CREATED,
            pickup: pickupSnapshot,
            customer: {
                name: payload.customer.name.trim(),
                mobileNumber: payload.customer.mobileNumber.trim(),
                countryCode: payload.customer.countryCode?.trim() || "+91",
                customerId: payload.customer.customerId
                    ? new Types.ObjectId(payload.customer.customerId)
                    : null,
            },
            dropoff: dropoffSnapshot,
            distance,
            statusHistory: [statusHistoryEntry as any],
            assignmentHistory: [],
            isActive: true,
        };

        if (payload.customerNotes?.trim()) {
            createPayload.customerNotes = payload.customerNotes.trim();
        }

        const manualDelivery = await this.repo.create(createPayload);

        await this.whatsappService.sendCreated(manualDelivery);

        // Notify all active drivers that a new manual delivery order is available to take
        this.notificationService.notifyDriversNewAvailableDelivery(manualDelivery);

        return manualDelivery;
    }

    /**
     * Retrieves delivery details by ID with access control.
     */
    async getDeliveryById(deliveryId: string, userId: string) {
        const user = await this.repo.findUserById(userId);
        if (!user) throw new AppError("User not found", 404);

        const delivery = await this.repo.findById(deliveryId);
        if (!delivery || !delivery.isActive) {
            throw new AppError("Manual delivery not found", 404);
        }

        const isAdmin = this.isUserAdmin(user);
        const isVendorOwner =
            delivery.vendor?.toString() === userId.toString() ||
            (delivery.vendor as any)?._id?.toString() === userId.toString();

        const isAssignedDriver =
            delivery.driverUser?.toString() === userId.toString() ||
            (delivery.driverUser as any)?._id?.toString() === userId.toString();

        if (!isAdmin && !isVendorOwner && !isAssignedDriver) {
            throw new AppError(
                "You are not authorized to view this manual delivery",
                403
            );
        }

        return delivery;
    }

    /**
     * Lists accessible deliveries with filtering and pagination.
     */
    async listDeliveries(
        userId: string,
        params: {
            page?: number;
            limit?: number;
            status?: string;
            search?: string;
            customerMobile?: string;
            startDate?: string;
            endDate?: string;
            deliveryNumber?: string;
            vendorId?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        }
    ) {
        const user = await this.repo.findUserById(userId);
        if (!user) throw new AppError("User not found", 404);

        const isAdmin = this.isUserAdmin(user);
        const filter: IManualDeliveryFilter = {};

        if (!isAdmin) {
            // Vendors can only view their own deliveries
            filter.vendor = userId;
        } else if (params.vendorId) {
            // Admin can optionally filter by vendor
            filter.vendor = params.vendorId;
        }

        if (params.status && params.status in MANUAL_DELIVERY_STATUS) {
            filter.status = params.status as ManualDeliveryStatus;
        }

        if (params.search) filter.search = params.search;
        if (params.customerMobile) filter.customerMobile = params.customerMobile;
        if (params.deliveryNumber) filter.deliveryNumber = params.deliveryNumber;

        if (params.startDate) {
            const parsed = new Date(params.startDate);
            if (!Number.isNaN(parsed.getTime())) filter.startDate = parsed;
        }

        if (params.endDate) {
            const parsed = new Date(params.endDate);
            if (!Number.isNaN(parsed.getTime())) filter.endDate = parsed;
        }

        const pagination: IPaginationOptions = {
            page: Number(params.page) || 1,
            limit: Number(params.limit) || 10,
            sortBy: params.sortBy || "createdAt",
            sortOrder: params.sortOrder === "asc" ? "asc" : "desc",
        };

        return this.repo.findWithPagination(filter, pagination);
    }

    /**
     * Updates eligible fields on a manual delivery request (e.g. dropoff address, notes).
     */
    async updateDelivery(
        deliveryId: string,
        userId: string,
        updateData: {
            customer?: {
                name?: string;
                mobileNumber?: string;
                countryCode?: string;
            };
            dropoff?: {
                addressLine1?: string;
                addressLine2?: string;
                area?: string;
                city?: string;
                state?: string;
                postalCode?: string;
                country?: string;
                landmark?: string;
                latitude?: number | null;
                longitude?: number | null;
                formattedAddress?: string;
                mapLink?: string | null;
            };
            customerNotes?: string;
        }
    ) {
        const delivery = await this.getDeliveryById(deliveryId, userId);

        if (!EDITABLE_STATUSES.includes(delivery.status)) {
            throw new AppError(
                `Delivery cannot be modified in its current status (${delivery.status}). Modifications are only allowed when CREATED.`,
                400
            );
        }

        const setDoc: Record<string, any> = {};

        if (updateData.customer) {
            if (updateData.customer.name) {
                setDoc["customer.name"] = updateData.customer.name.trim();
            }
            if (updateData.customer.mobileNumber) {
                setDoc["customer.mobileNumber"] = updateData.customer.mobileNumber.trim();
            }
            if (updateData.customer.countryCode) {
                setDoc["customer.countryCode"] = updateData.customer.countryCode.trim();
            }
        }

        if (updateData.customerNotes !== undefined) {
            setDoc["customerNotes"] = updateData.customerNotes.trim();
        }

        if (updateData.dropoff) {
            let mapLinkCoords: { latitude: number; longitude: number } | null = null;
            if (updateData.dropoff.mapLink?.trim()) {
                try {
                    mapLinkCoords =
                        await this.mapLinkService.parseMapLinkToCoordinates(
                            updateData.dropoff.mapLink.trim()
                        );
                    if (mapLinkCoords) {
                        updateData.dropoff.latitude = mapLinkCoords.latitude;
                        updateData.dropoff.longitude = mapLinkCoords.longitude;
                    }
                } catch {
                    // Fall back gracefully
                }
            }

            for (const [key, val] of Object.entries(updateData.dropoff)) {
                if (val !== undefined) {
                    setDoc[`dropoff.${key}`] =
                        typeof val === "string" ? val.trim() : val;
                }
            }

            // Recalculate distance if coordinates changed
            const mergedDropoff = {
                ...delivery.dropoff,
                ...updateData.dropoff,
            };
            const dropoffCoords = this.extractCoordinates(mergedDropoff);
            const pickupCoords = this.extractCoordinates(delivery.pickup);

            if (dropoffCoords.latitude !== null && dropoffCoords.longitude !== null) {
                setDoc["dropoff.location"] = {
                    type: "Point",
                    coordinates: [dropoffCoords.longitude, dropoffCoords.latitude],
                };
            }

            const newDistance = await this.distanceService.calculateDistance(
                pickupCoords,
                dropoffCoords
            );
            setDoc["distance"] = newDistance;
        }

        const updated = await this.repo.updateById(deliveryId, {
            $set: setDoc,
        });

        return updated;
    }

    /**
     * Assigns a driver to a manual delivery request.
     */
    async assignDriver(
        deliveryId: string,
        userId: string,
        driverId: string
    ) {
        const user = await this.repo.findUserById(userId);
        if (!user) throw new AppError("User not found", 404);

        const delivery = await this.getDeliveryById(deliveryId, userId);

        if (delivery.status !== MANUAL_DELIVERY_STATUS.CREATED) {
            throw new AppError(
                `Driver cannot be assigned. Delivery status is '${delivery.status}' (expected 'CREATED').`,
                400
            );
        }

        // Validate driver existence and eligibility
        const driverProfile = await this.repo.findDriverProfile(driverId);
        if (!driverProfile) {
            throw new AppError("Driver not found", 404);
        }

        if (
            driverProfile.profileStatus === "suspended" ||
            driverProfile.profileStatus === "rejected"
        ) {
            throw new AppError(
                `Driver profile is currently ${driverProfile.profileStatus} and cannot be assigned`,
                400
            );
        }

        const driverUser = driverProfile.user as any;
        const driverName = `${driverUser?.firstName || ""} ${driverUser?.lastName || ""}`.trim() || "Driver";

        const driverSnapshot = {
            driverId: driverProfile._id,
            name: driverName,
            phone: driverUser?.mobileNumber || "",
            vehicleType: driverProfile.vehicleType || "bike",
            vehicleNumber: driverProfile.vehicleNumber || "",
        };

        const statusHistoryEntry = {
            status: MANUAL_DELIVERY_STATUS.ASSIGNED,
            title: STATUS_DISPLAY_TITLES.ASSIGNED,
            remark: `Assigned to driver ${driverName} (${driverSnapshot.vehicleNumber}).`,
            updatedBy: new Types.ObjectId(userId),
            updatedByRole: this.isUserAdmin(user) ? "admin" : "vendor",
            updatedAt: new Date(),
        };

        const assignmentHistoryEntry = {
            driver: driverProfile._id,
            driverName,
            action: "ASSIGNED",
            assignedAt: new Date(),
        };

        const assigned = await this.repo.assignDriverAtomic(
            deliveryId,
            driverProfile._id as Types.ObjectId,
            driverUser?._id ? (driverUser._id as Types.ObjectId) : (driverProfile.user as Types.ObjectId),
            driverSnapshot,
            statusHistoryEntry,
            assignmentHistoryEntry
        );

        if (!assigned) {
            throw new AppError(
                "Failed to assign driver. The delivery may have been modified concurrently.",
                409
            );
        }

        // Notify assigned driver with push notification
        this.notificationService.notifyAssignedDriver(
            assigned,
            driverUser?._id ? (driverUser._id as Types.ObjectId) : (driverProfile.user as Types.ObjectId)
        );

        return assigned;
    }

    /**
     * Cancels a manual delivery request.
     */
    async cancelDelivery(
        deliveryId: string,
        userId: string,
        reason?: string
    ) {
        const user = await this.repo.findUserById(userId);
        if (!user) throw new AppError("User not found", 404);

        const delivery = await this.getDeliveryById(deliveryId, userId);

        if (TERMINAL_STATUSES.includes(delivery.status)) {
            throw new AppError(
                `Delivery cannot be cancelled because it is already ${delivery.status}.`,
                400
            );
        }

        // Strict Rider Acceptance Cancellation Guard
        const acceptedStatuses: ManualDeliveryStatus[] = [
            MANUAL_DELIVERY_STATUS.ACCEPTED,
            MANUAL_DELIVERY_STATUS.PICKED_UP,
            MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY,
            MANUAL_DELIVERY_STATUS.REACHED,
        ];
        const isRiderAccepted =
            Boolean(delivery.acceptedAt) ||
            Boolean(delivery.driver && delivery.acceptedAt) ||
            acceptedStatuses.includes(delivery.status);

        if (isRiderAccepted) {
            throw new BadRequestException(
                "Once accepted by the rider, cancellation is not allowed."
            );
        }

        const isAdmin = this.isUserAdmin(user);
        const vendorOrAdminFilter = isAdmin
            ? {}
            : { vendor: new Types.ObjectId(userId) };

        const statusHistoryEntry = {
            status: MANUAL_DELIVERY_STATUS.CANCELLED,
            title: STATUS_DISPLAY_TITLES.CANCELLED,
            remark: reason || "Delivery was cancelled.",
            updatedBy: new Types.ObjectId(userId),
            updatedByRole: isAdmin ? "admin" : "vendor",
            updatedAt: new Date(),
        };

        const cancelled = await this.repo.cancelDeliveryAtomic(
            deliveryId,
            vendorOrAdminFilter,
            reason || "Cancelled by vendor",
            statusHistoryEntry
        );

        if (!cancelled) {
            throw new AppError(
                "Unable to cancel delivery. It may already be completed or cancelled.",
                400
            );
        }

        return cancelled;
    }

    // ==========================================
    // DRIVER OPERATIONS
    // ==========================================

    /**
     * Resolves the DriverProfile for the authenticated user.
     */
    async getDriverProfileForUser(userId: string) {
        const driverProfile = await this.repo.findDriverProfile(userId);
        if (!driverProfile) {
            throw new AppError(
                "Driver profile not found for this authenticated account",
                404
            );
        }
        return driverProfile;
    }

    /**
     * Lists manual deliveries assigned to the authenticated driver.
     */
    async listDriverDeliveries(
        userId: string,
        params: {
            page?: number;
            limit?: number;
            status?: string;
        }
    ) {
        const driverProfile = await this.getDriverProfileForUser(userId);

        const filter: IManualDeliveryFilter = {
            driver: driverProfile._id.toString(),
        };

        if (params.status && params.status in MANUAL_DELIVERY_STATUS) {
            filter.status = params.status as ManualDeliveryStatus;
        }

        const pagination: IPaginationOptions = {
            page: Number(params.page) || 1,
            limit: Number(params.limit) || 10,
            sortBy: "assignedAt",
            sortOrder: "desc",
        };

        return this.repo.findWithPagination(filter, pagination);
    }

    /**
     * Retrieves an assigned or available manual delivery for the authenticated driver.
     */
    async getDriverDeliveryById(deliveryId: string, userId: string) {
        const driverProfile = await this.getDriverProfileForUser(userId);
        const delivery = await this.repo.findById(deliveryId);

        if (!delivery || !delivery.isActive) {
            throw new AppError("Manual delivery not found", 404);
        }

        // Available deliveries (CREATED with no assigned driver) are accessible for viewing
        // so drivers can inspect order details before taking it.
        const isAvailableOrder =
            delivery.status === MANUAL_DELIVERY_STATUS.CREATED && !delivery.driver;

        const isDriver =
            delivery.driver?.toString() === driverProfile._id.toString() ||
            (delivery.driver as any)?._id?.toString() === driverProfile._id.toString();

        if (!isAvailableOrder && !isDriver) {
            throw new AppError(
                "You are not authorized to view this manual delivery",
                403
            );
        }

        return delivery;
    }

    /**
     * Driver accepts an assigned manual delivery.
     */
    async driverAccept(deliveryId: string, userId: string) {
        const driverProfile = await this.getDriverProfileForUser(userId);
        const delivery = await this.getDriverDeliveryById(deliveryId, userId);

        if (delivery.status !== MANUAL_DELIVERY_STATUS.ASSIGNED) {
            throw new AppError(
                `Cannot accept delivery. Current status is '${delivery.status}' (expected 'ASSIGNED').`,
                400
            );
        }

        const statusHistoryEntry = {
            status: MANUAL_DELIVERY_STATUS.ACCEPTED,
            title: STATUS_DISPLAY_TITLES.ACCEPTED,
            remark: "Driver accepted the delivery assignment.",
            updatedBy: new Types.ObjectId(userId),
            updatedByRole: "driver",
            updatedAt: new Date(),
        };

        const accepted = await this.repo.driverAcceptAtomic(
            deliveryId,
            driverProfile._id as Types.ObjectId,
            statusHistoryEntry
        );

        if (!accepted) {
            throw new AppError(
                "Failed to accept delivery. It may have already been accepted or reassigned.",
                409
            );
        }

        return accepted;
    }

    /**
     * Driver rejects an assigned manual delivery.
     * Records rejection in audit history and resets status back to CREATED for reassignment!
     */
    async driverReject(
        deliveryId: string,
        userId: string,
        reason?: string
    ) {
        const driverProfile = await this.getDriverProfileForUser(userId);
        const delivery = await this.getDriverDeliveryById(deliveryId, userId);

        if (delivery.status !== MANUAL_DELIVERY_STATUS.ASSIGNED) {
            throw new AppError(
                `Cannot reject delivery. Current status is '${delivery.status}' (expected 'ASSIGNED').`,
                400
            );
        }

        const rejectionReason = reason || "Driver declined the assignment";
        const driverUser = driverProfile.user as any;
        const driverName = `${driverUser?.firstName || ""} ${driverUser?.lastName || ""}`.trim() || "Driver";

        const statusHistoryEntry = {
            status: MANUAL_DELIVERY_STATUS.CREATED,
            title: "Driver Assignment Declined",
            remark: `Driver ${driverName} rejected the assignment: ${rejectionReason}. Returned to pool for reassignment.`,
            updatedBy: new Types.ObjectId(userId),
            updatedByRole: "driver",
            updatedAt: new Date(),
        };

        const assignmentHistoryEntry = {
            driver: driverProfile._id,
            driverName,
            action: "REJECTED",
            assignedAt: delivery.assignedAt || new Date(),
            respondedAt: new Date(),
            reason: rejectionReason,
        };

        const rejected = await this.repo.driverRejectAtomic(
            deliveryId,
            driverProfile._id as Types.ObjectId,
            rejectionReason,
            statusHistoryEntry,
            assignmentHistoryEntry
        );

        if (!rejected) {
            throw new AppError(
                "Failed to reject delivery. It may have already been updated.",
                409
            );
        }

        // Broadcast notification to all drivers that delivery has returned to available pool
        this.notificationService.notifyDriversNewAvailableDelivery(rejected);

        return rejected;
    }

    /**
     * Driver updates milestone delivery status (PICKED_UP, OUT_FOR_DELIVERY, REACHED, DELIVERED, FAILED).
     */
    async driverUpdateStatus(
        deliveryId: string,
        userId: string,
        newStatus: ManualDeliveryStatus,
        remark?: string,
        failureReason?: string
    ) {
        const driverProfile = await this.getDriverProfileForUser(userId);
        const delivery = await this.getDriverDeliveryById(deliveryId, userId);

        const currentStatus = delivery.status;

        // Valid transition checks
        const allowedTransitions: Record<ManualDeliveryStatus, ManualDeliveryStatus[]> = {
            CREATED: [],
            ASSIGNED: [],
            ACCEPTED: [MANUAL_DELIVERY_STATUS.PICKED_UP, MANUAL_DELIVERY_STATUS.FAILED],
            PICKED_UP: [MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY, MANUAL_DELIVERY_STATUS.FAILED],
            OUT_FOR_DELIVERY: [
                MANUAL_DELIVERY_STATUS.REACHED,
                MANUAL_DELIVERY_STATUS.DELIVERED,
                MANUAL_DELIVERY_STATUS.FAILED,
            ],
            REACHED: [MANUAL_DELIVERY_STATUS.DELIVERED, MANUAL_DELIVERY_STATUS.FAILED],
            DELIVERED: [],
            CANCELLED: [],
            FAILED: [],
        };

        const allowed = allowedTransitions[currentStatus] || [];
        if (!allowed.includes(newStatus)) {
            throw new AppError(
                `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(", ") || "None"}`,
                400
            );
        }

        // Map status to timestamp field
        const timestampMap: Record<string, string> = {
            PICKED_UP: "pickedUpAt",
            OUT_FOR_DELIVERY: "outForDeliveryAt",
            REACHED: "reachedAt",
            DELIVERED: "deliveredAt",
            FAILED: "failedAt",
        };

        const timestampField = timestampMap[newStatus] || "updatedAt";
        const extraUpdates: Record<string, any> = {};

        if (newStatus === MANUAL_DELIVERY_STATUS.FAILED && failureReason) {
            extraUpdates.failureReason = failureReason.trim();
        }

        const statusHistoryEntry = {
            status: newStatus,
            title: STATUS_DISPLAY_TITLES[newStatus] || newStatus,
            remark: remark || failureReason || `Driver marked delivery as ${newStatus}.`,
            updatedBy: new Types.ObjectId(userId),
            updatedByRole: "driver",
            updatedAt: new Date(),
        };

        const updated = await this.repo.driverUpdateStatusAtomic(
            deliveryId,
            driverProfile._id as Types.ObjectId,
            [currentStatus],
            newStatus,
            timestampField,
            extraUpdates,
            statusHistoryEntry
        );

        if (!updated) {
            throw new AppError(
                "Failed to update delivery status. It may have been modified concurrently.",
                409
            );
        }

        // Notify vendor about status update
        this.notificationService.notifyVendorStatusUpdate(
            updated,
            newStatus,
            remark || failureReason
        );

        return updated;
    }

    /**
     * Lists manual deliveries currently available in the pool for any driver to take.
     */
    async listAvailableDeliveries(
        userId: string,
        params: {
            page?: number;
            limit?: number;
            search?: string;
            city?: string;
            deliveryNumber?: string;
            startDate?: string;
            endDate?: string;
        } = {}
    ) {
        // Ensure caller is a registered, active driver profile
        const driverProfile = await this.getDriverProfileForUser(userId);

        if (
            driverProfile.profileStatus === "suspended" ||
            driverProfile.profileStatus === "rejected"
        ) {
            throw new AppError(
                `Driver profile is currently ${driverProfile.profileStatus} and cannot browse deliveries`,
                403
            );
        }

        const pagination: IPaginationOptions = {
            page: Number(params.page) || 1,
            limit: Number(params.limit) || 10,
            sortBy: "createdAt",
            sortOrder: "desc",
        };

        const filters: any = {
            search: params.search,
            city: params.city,
            deliveryNumber: params.deliveryNumber,
            startDate: params.startDate ? new Date(params.startDate) : undefined,
            endDate: params.endDate ? new Date(params.endDate) : undefined,
        };

        const result = await this.repo.findAvailableDeliveries(
            filters,
            pagination
        );

        return {
            deliveries: result.deliveries,
            total: result.total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.max(1, Math.ceil(result.total / pagination.limit)),
        };
    }

    /**
     * Driver takes an available manual delivery directly from the pool.
     * Atomically transitions status from CREATED -> ACCEPTED and assigns the driver.
     * Mirrors vendor orders takeOrder flow.
     */
    async driverTake(deliveryId: string, userId: string) {
        const driverProfile = await this.getDriverProfileForUser(userId);

        if (
            driverProfile.profileStatus === "suspended" ||
            driverProfile.profileStatus === "rejected"
        ) {
            throw new AppError(
                `Your driver profile is currently ${driverProfile.profileStatus} and cannot take deliveries`,
                400
            );
        }

        const driverUser = driverProfile.user as any;
        const driverName =
            `${driverUser?.firstName || ""} ${driverUser?.lastName || ""}`.trim() ||
            "Driver";

        const driverSnapshot = {
            driverId: driverProfile._id,
            name: driverName,
            phone: driverUser?.mobileNumber || "",
            vehicleType: driverProfile.vehicleType || "bike",
            vehicleNumber: driverProfile.vehicleNumber || "",
        };

        const statusHistoryEntry = {
            status: MANUAL_DELIVERY_STATUS.ACCEPTED,
            title: STATUS_DISPLAY_TITLES.ACCEPTED,
            remark: `Delivery taken and accepted by driver ${driverName} (${driverSnapshot.vehicleNumber}).`,
            updatedBy: new Types.ObjectId(userId),
            updatedByRole: "driver",
            updatedAt: new Date(),
        };

        const assignmentHistoryEntry = {
            driver: driverProfile._id,
            driverName,
            action: "ACCEPTED",
            assignedAt: new Date(),
            respondedAt: new Date(),
        };

        const taken = await this.repo.driverTakeOrderAtomic(
            deliveryId,
            driverProfile._id as Types.ObjectId,
            driverUser?._id ? (driverUser._id as Types.ObjectId) : (driverProfile.user as Types.ObjectId),
            driverSnapshot,
            statusHistoryEntry,
            assignmentHistoryEntry
        );

        if (!taken) {
            throw new AppError(
                "This delivery order has already been taken by another driver or is no longer available.",
                409
            );
        }

        // Notify vendor that order has been taken and accepted by driver
        this.notificationService.notifyVendorStatusUpdate(
            taken,
            MANUAL_DELIVERY_STATUS.ACCEPTED,
            `Delivery accepted by driver ${driverName}.`
        );

        return taken;
    }

    /**
     * Lists past completed or terminal deliveries for the authenticated driver.
     */
    async listDriverHistory(
        userId: string,
        params: {
            page?: number;
            limit?: number;
            search?: string;
            status?: string;
            startDate?: string;
            endDate?: string;
        } = {}
    ) {
        const driverProfile = await this.getDriverProfileForUser(userId);

        const pagination: IPaginationOptions = {
            page: Number(params.page) || 1,
            limit: Number(params.limit) || 10,
            sortBy: "deliveredAt",
            sortOrder: "desc",
        };

        const filters: any = {
            search: params.search,
            status: params.status,
            startDate: params.startDate ? new Date(params.startDate) : undefined,
            endDate: params.endDate ? new Date(params.endDate) : undefined,
        };

        const result = await this.repo.findDriverHistory(
            driverProfile._id,
            filters,
            pagination
        );

        return {
            deliveries: result.deliveries,
            total: result.total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.max(1, Math.ceil(result.total / pagination.limit)),
        };
    }

    /**
     * Retrieves aggregated performance stats for the authenticated driver.
     */
    async getDriverStats(userId: string) {
        const driverProfile = await this.getDriverProfileForUser(userId);
        return await this.repo.getDriverStats(driverProfile._id);
    }
}

