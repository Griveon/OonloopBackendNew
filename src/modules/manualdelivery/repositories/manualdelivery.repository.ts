import mongoose, { Types } from "mongoose";
import {
    ManualDeliveryModel,
    ManualDeliveryCounterModel,
} from "../models/manualdelivery.model.js";
import { DriverProfileModel } from "../../driverprofile/models/driverprofile.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { UserModel } from "../../user/models/user.model.js";
import type {
    IManualDelivery,
    IManualDeliveryDocument,
    IManualDeliveryFilter,
    IPaginationOptions,
} from "../interfaces/manualdelivery.interface.js";
import {
    MANUAL_DELIVERY_STATUS,
    TERMINAL_STATUSES,
} from "../constants/manualdelivery.constants.js";

export class ManualDeliveryRepository {
    /**
     * Concurrency-safe unique delivery reference generator.
     * Format: MDEL-YYYYMMDD-0001
     */
    async generateDeliveryNumber(): Promise<string> {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const dateKey = `${yyyy}${mm}${dd}`;
        const counterId = `MDEL-${dateKey}`;

        try {
            const counter =
                await ManualDeliveryCounterModel.findOneAndUpdate(
                    { _id: counterId },
                    { $inc: { seq: 1 } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

            const sequenceNumber = counter?.seq || 1;
            const paddedSequence = String(sequenceNumber).padStart(4, "0");
            return `${counterId}-${paddedSequence}`;
        } catch {
            // Fallback to highest existing order number query + retry if counter encounters race
            const regex = new RegExp(`^${counterId}-`);
            const latest = await ManualDeliveryModel.findOne({
                deliveryNumber: regex,
            })
                .sort({ deliveryNumber: -1 })
                .select("deliveryNumber")
                .lean();

            let nextSeq = 1;
            if (latest?.deliveryNumber) {
                const parts = latest.deliveryNumber.split("-");
                const lastSeq = Number(parts[2] || 0);
                if (!Number.isNaN(lastSeq)) {
                    nextSeq = lastSeq + 1;
                }
            }

            return `${counterId}-${String(nextSeq).padStart(4, "0")}`;
        }
    }

    /**
     * Creates a new manual delivery document.
     */
    async create(
        data: Partial<IManualDelivery>
    ): Promise<IManualDeliveryDocument> {
        return ManualDeliveryModel.create(data);
    }

    /**
     * Finds a delivery by its MongoDB ID.
     */
    async findById(
        id: string | Types.ObjectId
    ): Promise<IManualDeliveryDocument | null> {
        if (!Types.ObjectId.isValid(id)) return null;

        return ManualDeliveryModel.findById(id)
            .populate("vendor", "firstName lastName mobileNumber email")
            .populate("vendorProfile", "storeName storeLocationAddress storeLogo")
            .populate("driver", "vehicleType vehicleNumber profileStatus isOnline")
            .populate("driverUser", "firstName lastName mobileNumber")
            .populate("createdBy", "firstName lastName email role");
    }

    /**
     * Finds a delivery by its human-readable delivery reference number.
     */
    async findByDeliveryNumber(
        deliveryNumber: string
    ): Promise<IManualDeliveryDocument | null> {
        return ManualDeliveryModel.findOne({ deliveryNumber: deliveryNumber.trim() })
            .populate("vendor", "firstName lastName mobileNumber email")
            .populate("vendorProfile", "storeName storeLocationAddress storeLogo")
            .populate("driver", "vehicleType vehicleNumber profileStatus isOnline")
            .populate("driverUser", "firstName lastName mobileNumber");
    }

    /**
     * Finds a driver profile by driver profile ID or linked User ID.
     */
    async findDriverProfile(
        driverIdentifier: string | Types.ObjectId
    ) {
        if (!driverIdentifier) return null;

        // Try direct driver profile id first
        if (Types.ObjectId.isValid(driverIdentifier)) {
            const byId = await DriverProfileModel.findById(driverIdentifier)
                .populate("user", "firstName lastName mobileNumber")
                .lean();
            if (byId) return byId;
        }

        // Try finding by linked user id
        return DriverProfileModel.findOne({ user: driverIdentifier })
            .populate("user", "firstName lastName mobileNumber")
            .lean();
    }

    /**
     * Finds vendor profile by linked user id.
     */
    async findVendorProfileByUserId(userId: string | Types.ObjectId) {
        return VendorProfileModel.findOne({ user: userId }).lean();
    }

    /**
     * Finds user by id.
     */
    async findUserById(userId: string | Types.ObjectId) {
        return UserModel.findById(userId).lean();
    }

    /**
     * Builds and runs filtered, paginated query.
     */
    async findWithPagination(
        filters: IManualDeliveryFilter,
        pagination: IPaginationOptions
    ): Promise<{
        deliveries: IManualDeliveryDocument[];
        total: number;
    }> {
        const query: Record<string, any> = {
            isActive: true,
        };

        if (filters.vendor) {
            query.vendor = new Types.ObjectId(filters.vendor.toString());
        }

        if (filters.driver) {
            query.driver = new Types.ObjectId(filters.driver.toString());
        }

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.deliveryNumber) {
            query.deliveryNumber = filters.deliveryNumber.trim();
        }

        if (filters.customerMobile) {
            query["customer.mobileNumber"] = filters.customerMobile.trim();
        }

        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }

        if (filters.search && filters.search.trim()) {
            const term = filters.search.trim();
            const searchRegex = new RegExp(term, "i");
            query.$or = [
                { deliveryNumber: searchRegex },
                { "customer.name": searchRegex },
                { "customer.mobileNumber": searchRegex },
                { "dropoff.addressLine1": searchRegex },
                { "dropoff.landmark": searchRegex },
            ];
        }

        const page = Math.max(1, pagination.page || 1);
        const limit = Math.min(100, Math.max(1, pagination.limit || 10));
        const skip = (page - 1) * limit;

        const sortField = pagination.sortBy || "createdAt";
        const sortDirection = pagination.sortOrder === "asc" ? 1 : -1;
        const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

        const [deliveries, total] = await Promise.all([
            ManualDeliveryModel.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate("vendor", "firstName lastName mobileNumber email")
                .populate("driver", "vehicleType vehicleNumber profileStatus")
                .populate("driverUser", "firstName lastName mobileNumber")
                .populate("createdBy", "firstName lastName")
                .lean(),
            ManualDeliveryModel.countDocuments(query),
        ]);

        return {
            deliveries: deliveries as unknown as IManualDeliveryDocument[],
            total,
        };
    }

    /**
     * Atomically assigns a driver to a manual delivery if eligible.
     */
    async assignDriverAtomic(
        deliveryId: string | Types.ObjectId,
        driverProfileId: Types.ObjectId,
        driverUserId: Types.ObjectId,
        driverSnapshot: any,
        statusHistoryEntry: any,
        assignmentHistoryEntry: any
    ): Promise<IManualDeliveryDocument | null> {
        const id = new Types.ObjectId(deliveryId.toString());
        return (await ManualDeliveryModel.findOneAndUpdate(
            {
                _id: id,
                status: MANUAL_DELIVERY_STATUS.CREATED,
                isActive: true,
            },
            {
                $set: {
                    driver: driverProfileId,
                    driverUser: driverUserId,
                    driverSnapshot,
                    status: MANUAL_DELIVERY_STATUS.ASSIGNED,
                    assignedAt: new Date(),
                    rejectionReason: null,
                },
                $push: {
                    statusHistory: statusHistoryEntry,
                    assignmentHistory: assignmentHistoryEntry,
                },
            },
            { new: true }
        )
            .populate("vendor", "firstName lastName mobileNumber email")
            .populate("driver", "vehicleType vehicleNumber profileStatus")
            .populate("driverUser", "firstName lastName mobileNumber")) as unknown as IManualDeliveryDocument | null;
    }

    /**
     * Driver accepts assignment atomically.
     */
    async driverAcceptAtomic(
        deliveryId: string | Types.ObjectId,
        driverProfileId: Types.ObjectId,
        statusHistoryEntry: any
    ): Promise<IManualDeliveryDocument | null> {
        const id = new Types.ObjectId(deliveryId.toString());
        return (await ManualDeliveryModel.findOneAndUpdate(
            {
                _id: id,
                driver: driverProfileId,
                status: MANUAL_DELIVERY_STATUS.ASSIGNED,
                isActive: true,
            },
            {
                $set: {
                    status: MANUAL_DELIVERY_STATUS.ACCEPTED,
                    acceptedAt: new Date(),
                },
                $push: {
                    statusHistory: statusHistoryEntry,
                    assignmentHistory: {
                        driver: driverProfileId,
                        action: "ACCEPTED",
                        assignedAt: new Date(),
                        respondedAt: new Date(),
                    },
                },
            },
            { new: true }
        )) as unknown as IManualDeliveryDocument | null;
    }

    /**
     * Driver rejects assignment atomically.
     * Clears driver and resets status back to CREATED for reassignment!
     */
    async driverRejectAtomic(
        deliveryId: string | Types.ObjectId,
        driverProfileId: Types.ObjectId,
        reason: string,
        statusHistoryEntry: any,
        assignmentHistoryEntry: any
    ): Promise<IManualDeliveryDocument | null> {
        const id = new Types.ObjectId(deliveryId.toString());
        return (await ManualDeliveryModel.findOneAndUpdate(
            {
                _id: id,
                driver: driverProfileId,
                status: MANUAL_DELIVERY_STATUS.ASSIGNED,
                isActive: true,
            },
            {
                $set: {
                    status: MANUAL_DELIVERY_STATUS.CREATED,
                    driver: null,
                    driverUser: null,
                    driverSnapshot: null,
                    assignedAt: null,
                    rejectionReason: reason,
                },
                $push: {
                    statusHistory: statusHistoryEntry,
                    assignmentHistory: assignmentHistoryEntry,
                },
            },
            { new: true }
        )) as unknown as IManualDeliveryDocument | null;
    }

    /**
     * Driver updates delivery milestone status (PICKED_UP, OUT_FOR_DELIVERY, REACHED, DELIVERED, FAILED).
     */
    async driverUpdateStatusAtomic(
        deliveryId: string | Types.ObjectId,
        driverProfileId: Types.ObjectId,
        fromStatuses: string[],
        newStatus: string,
        timestampField: string,
        extraUpdates: Record<string, any>,
        statusHistoryEntry: any
    ): Promise<IManualDeliveryDocument | null> {
        const id = new Types.ObjectId(deliveryId.toString());
        return (await ManualDeliveryModel.findOneAndUpdate(
            {
                _id: id,
                driver: driverProfileId,
                status: { $in: fromStatuses },
                isActive: true,
            } as any,
            {
                $set: {
                    status: newStatus,
                    [timestampField]: new Date(),
                    ...extraUpdates,
                },
                $push: {
                    statusHistory: statusHistoryEntry,
                },
            },
            { new: true }
        )) as unknown as IManualDeliveryDocument | null;
    }

    /**
     * Cancels a manual delivery atomically if not in terminal status.
     */
    async cancelDeliveryAtomic(
        deliveryId: string | Types.ObjectId,
        vendorOrAdminFilter: Record<string, any>,
        reason: string,
        statusHistoryEntry: any
    ): Promise<IManualDeliveryDocument | null> {
        const id = new Types.ObjectId(deliveryId.toString());
        return (await ManualDeliveryModel.findOneAndUpdate(
            {
                _id: id,
                ...vendorOrAdminFilter,
                status: {
                    $nin: [
                        ...TERMINAL_STATUSES,
                        MANUAL_DELIVERY_STATUS.ACCEPTED,
                        MANUAL_DELIVERY_STATUS.PICKED_UP,
                        MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY,
                        MANUAL_DELIVERY_STATUS.REACHED,
                    ],
                },
                acceptedAt: null,
                isActive: true,
            },
            {
                $set: {
                    status: MANUAL_DELIVERY_STATUS.CANCELLED,
                    cancelledAt: new Date(),
                    cancellationReason: reason,
                },
                $push: {
                    statusHistory: statusHistoryEntry,
                },
            },
            { new: true }
        )) as unknown as IManualDeliveryDocument | null;
    }

    /**
     * Updates editable fields on a delivery.
     */
    async updateById(
        id: string | Types.ObjectId,
        updateDoc: Record<string, any>
    ): Promise<IManualDeliveryDocument | null> {
        const objId = new Types.ObjectId(id.toString());
        return (await ManualDeliveryModel.findByIdAndUpdate(objId, updateDoc, {
            new: true,
        })) as unknown as IManualDeliveryDocument | null;
    }
}
