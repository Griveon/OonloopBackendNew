import { PersonalShopperBookingModel } from "../models/personalshopper.model.js";
import type { IPersonalShopperBooking } from "../interfaces/personalshopper.interface.js";
import { DriverProfileModel } from "../../driverprofile/models/driverprofile.model.js";

export class PersonalShopperRepository {
    async create(data: Partial<IPersonalShopperBooking>) {
        return PersonalShopperBookingModel.create(data);
    }

    async findById(id: string) {
        return PersonalShopperBookingModel.findById(id)
            .populate("user", "firstName lastName mobileNumber email")
            .populate("driver", "firstName lastName mobileNumber");
    }

    // Random online rider (no geo — demo). Returns the DriverProfile + its user.
    async findRandomOnlineDriver() {
        const drivers = await DriverProfileModel.find({ isOnline: true })
            .populate("user", "firstName lastName mobileNumber");
        if (!drivers.length) return null;
        return drivers[Math.floor(Math.random() * drivers.length)];
    }

    async getDriverProfileByUser(userId: any) {
        return DriverProfileModel.findOne({ user: userId })
            .populate("user", "firstName lastName mobileNumber");
    }

    async updateDriverLocation(userId: any, lng: number, lat: number) {
        return DriverProfileModel.updateOne(
            { user: userId },
            { $set: { currentLocation: { type: "Point", coordinates: [lng, lat] } } }
        );
    }

    // Open, unassigned, paid requests (shopper flow offer pool).
    async findOpenRequests() {
        return PersonalShopperBookingModel.find({
            status: "finding_rider",
            paymentStatus: "paid",
            driver: null,
            isActive: true,
        })
            .sort({ findingRiderSince: 1 })
            .populate("user", "firstName lastName mobileNumber");
    }

    // Atomic first-wins accept: only succeeds if still open & unassigned.
    async acceptBookingAtomic(bookingId: string, driverId: string, riderStart: any) {
        return PersonalShopperBookingModel.findOneAndUpdate(
            { _id: bookingId, status: "finding_rider", driver: null },
            {
                driver: driverId,
                driverAssignedAt: new Date(),
                riderStartLocation: riderStart,
                deliveryStartedAt: new Date(),
                status: "rider_assigned",
            },
            { new: true }
        ).populate("user", "firstName lastName mobileNumber");
    }

    // A rider is busy if they have an in-progress shopper job.
    async isRiderBusy(driverId: string) {
        const n = await PersonalShopperBookingModel.countDocuments({
            driver: driverId,
            status: { $in: ["rider_assigned", "heading_to_store", "returning_to_customer"] },
            isActive: true,
        });
        return n > 0;
    }

    // Bookings assigned to a rider (driver = their user id).
    async findByDriver(driverId: string, statuses?: string[]) {
        const query: any = { driver: driverId, isActive: true };
        if (statuses && statuses.length) query.status = { $in: statuses };
        return PersonalShopperBookingModel.find(query)
            .sort({ driverAssignedAt: -1 })
            .populate("user", "firstName lastName mobileNumber");
    }

    async findByUser(userId: string, page = 1, limit = 10, status?: string) {
        const skip = (page - 1) * limit;
        const query: any = { user: userId, isActive: true };
        if (status) query.status = status;

        const [items, total] = await Promise.all([
            PersonalShopperBookingModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            PersonalShopperBookingModel.countDocuments(query),
        ]);

        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async updateById(id: string, data: Partial<IPersonalShopperBooking>) {
        return PersonalShopperBookingModel.findByIdAndUpdate(id, data, {
            new: true,
        });
    }
}
