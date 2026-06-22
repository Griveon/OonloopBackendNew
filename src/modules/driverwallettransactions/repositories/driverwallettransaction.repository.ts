import { DriverWalletTransactionModel } from "../models/driverwallettransaction.model.js";

export class DriverWalletTransactionRepository {

    async create(data: any) {
        return DriverWalletTransactionModel.create(
            data
        );
    }

    async getDriverTransactions(
        driverId: string,
        page = 1,
        limit = 20
    ) {
        const skip = (page - 1) * limit;

        return DriverWalletTransactionModel.find({
            driver: driverId,
        })
            .sort({
                createdAt: -1,
            })
            .skip(skip)
            .limit(limit);
    }
}