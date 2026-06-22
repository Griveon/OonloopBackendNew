import { DriverWalletTransactionRepository } from "../../driverwallettransactions/repositories/driverwallettransaction.repository.js";
import { DriverWalletRepository } from "../repositories/driverwallet.repository.js";

export class DriverWalletService {

    private walletRepo =
        new DriverWalletRepository();

    private transactionRepo =
        new DriverWalletTransactionRepository();

    async createWallet(driverId: string) {

        const existing =
            await this.walletRepo.findByDriver(
                driverId
            );

        if (existing) {
            throw new Error(
                "Wallet already exists"
            );
        }

        return this.walletRepo.create({
            driver: driverId,
        });
    }

    async getWallet(driverId: any) {

        const wallet =
            await this.walletRepo.findByDriver(
                driverId
            );

        if (!wallet) {
            throw new Error(
                "Wallet not found"
            );
        }

        return wallet;
    }

    async creditWallet(
        driverId: string,
        amount: number,
        description = "",
        orderId?: string
    ) {

        const wallet =
            await this.walletRepo.findByDriver(
                driverId
            );

        if (!wallet) {
            throw new Error(
                "Wallet not found"
            );
        }

        wallet.balance += amount;
        wallet.totalEarned += amount;

        await wallet.save();

        await this.transactionRepo.create({
            wallet: wallet._id,
            driver: driverId,
            type: "credit",
            amount,
            description,
            orderId,
            balanceAfterTransaction:
                wallet.balance,
        });

        return wallet;
    }

    async debitWallet(
        driverId: string,
        amount: number,
        description = ""
    ) {

        const wallet =
            await this.walletRepo.findByDriver(
                driverId
            );

        if (!wallet) {
            throw new Error(
                "Wallet not found"
            );
        }

        if (
            wallet.balance < amount
        ) {
            throw new Error(
                "Insufficient balance"
            );
        }

        wallet.balance -= amount;

        await wallet.save();

        await this.transactionRepo.create({
            wallet: wallet._id,
            driver: driverId,
            type: "debit",
            amount,
            description,
            balanceAfterTransaction:
                wallet.balance,
        });

        return wallet;
    }

    async transactions(
        driverId: string,
        page = 1,
        limit = 20
    ) {
        return this.transactionRepo
            .getDriverTransactions(
                driverId,
                page,
                limit
            );
    }
}