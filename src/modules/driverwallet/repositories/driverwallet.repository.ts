import { DriverWalletModel } from "../models/driverwallet.model.js";

export class DriverWalletRepository {

    async create(data: any) {
        return DriverWalletModel.create(data);
    }

    async findByDriver(driverId: string) {
        return DriverWalletModel.findOne({
            driver: driverId,
        });
    }

    async updateBalance(
        driverId: string,
        amount: number
    ) {
        return DriverWalletModel.findOneAndUpdate(
            {
                driver: driverId,
            },
            {
                $inc: {
                    balance: amount,
                },
            },
            {
                new: true,
            }
        );
    }

    async findAll(
        page = 1,
        limit = 10
    ) {
        const skip = (page - 1) * limit;

        const [wallets, total] =
            await Promise.all([
                DriverWalletModel.find()
                    .populate("driver")
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 }),
                DriverWalletModel.countDocuments(),
            ]);

        return {
            wallets,
            total,
        };
    }
}