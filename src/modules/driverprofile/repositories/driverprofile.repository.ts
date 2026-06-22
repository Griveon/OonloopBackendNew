import type { IDriverDocument } from "../interfaces/driverprofile.interface.js";
import { DriverProfileModel } from "../models/driverprofile.model.js";

export class DriverProfileRepository {
    async create(data: Partial<IDriverDocument>) {
        return DriverProfileModel.create(data);
    }

    async findOne(filter: any) {
        return DriverProfileModel.findOne(filter);
    }

    async findByUserId(userId: string) {
        return DriverProfileModel.findOne({
            user: userId,
        });
    }

    async findById(id: string) {
        return DriverProfileModel.findOne({
            user: id,
        });
    }

    async findAll(
        page = 1,
        limit = 10,
        search = ""
    ) {
        const filter: any = {};

        if (search) {
            filter.$or = [
                {
                    firstName: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    lastName: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    vehicleNumber: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        const skip = (page - 1) * limit;

        const [drivers, total] =
            await Promise.all([
                DriverProfileModel.find(filter)
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 }),
                DriverProfileModel.countDocuments(
                    filter
                ),
            ]);

        return {
            drivers,
            total,
        };
    }

    async update(
        userId: string,
        data: Partial<IDriverDocument>
    ) {
        return DriverProfileModel.findOneAndUpdate(
            { user: userId },
            { $set: data },
            { new: true }
        );
    }

    async delete(userId: string) {
        return DriverProfileModel.findOneAndDelete({
            user: userId,
        });
    }
}