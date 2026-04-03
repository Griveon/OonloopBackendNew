import { PaymentTransactionRepository } from "../repositories/paymenttransaction.repository.js";

export class PaymentTransactionService {
    private repo: PaymentTransactionRepository;

    constructor() {
        this.repo = new PaymentTransactionRepository();
    }

    async createTransaction(data: any) {

        if (!data.amount || data.amount <= 0) {
            throw new Error("Invalid amount");
        }

        return await this.repo.create({
            ...data,
            status: "pending",
        });
    }

    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);
        if (!item) throw new Error("Transaction not found");
        return item;
    }

    async markSuccess(id: string, externalPaymentId?: string) {
        return await this.repo.markSuccess(id, externalPaymentId);
    }

    async markFailed(id: string) {
        return await this.repo.markFailed(id);
    }

    async cancel(id: string) {
        return await this.repo.cancel(id);
    }
}