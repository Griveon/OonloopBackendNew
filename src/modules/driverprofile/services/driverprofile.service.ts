import { DriverProfileRepository } from "../repositories/driverprofile.repository.js";

export class DriverProfileService {
    private driverRepo =
        new DriverProfileRepository();

    async createDriver(data: any) {
        const existing =
            await this.driverRepo.findOne({
                user: data.user,
            });

        if (existing) {
            throw new Error(
                "Driver profile already exists"
            );
        }

        return this.driverRepo.create(data);
    }

    async getDriverById(id: any) {
        const driver =
            await this.driverRepo.findById(id);

        if (!driver) {
            throw new Error("Driver not found");
        }

        return driver;
    }

    async getAllDrivers(options: any) {
        return this.driverRepo.findAll(
            options.page,
            options.limit,
            options.search
        );
    }

    async updateDriver(
        id: any,
        data: any
    ) {
        return this.driverRepo.update(id, data);
    }

    async deleteDriver(id: any) {
        return this.driverRepo.delete(id);
    }
}