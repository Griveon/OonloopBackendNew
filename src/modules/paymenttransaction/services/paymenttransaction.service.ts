import Razorpay from "razorpay";
import crypto from "crypto";

import { PaymentTransactionRepository } from "../repositories/paymenttransaction.repository.js";
import { PaymentMethodModel } from "../../paymentmethod/models/paymentmethod.model.js";
import { ProviderConnectionModel } from "../../providerconnection/models/providerconnection.model.js";
import { VendorSubscriptionService } from "../../vendorsubscription/services/vendorsubscription.service.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { OrderModel } from "../../order/models/order.model.js";
import { OrderRepository } from "../../order/repository/order.repository.js";

export class PaymentTransactionService {
    private repo: PaymentTransactionRepository;
    private subscriptionService: VendorSubscriptionService;

    constructor() {
        this.repo = new PaymentTransactionRepository();
        this.subscriptionService = new VendorSubscriptionService();
        
    }

    async createTransaction(data: any) {
        const { paymentMethod, providerConnection, amount, currency, userId, planId } = data;

        console.log("paymentMethod, providerConnection, amount, currency, userId, planId")
        console.log(paymentMethod, providerConnection, amount, currency, userId, planId)
        if (!paymentMethod || !providerConnection || !amount || !userId) {
            throw new Error("Missing required fields");
        }

        if (amount <= 0) {
            throw new Error("Invalid amount");
        }

        const method = await PaymentMethodModel.findById(paymentMethod);
        if (!method || method.isDeleted || !method.isActive) {
            throw new Error("Invalid payment method");
        }

        if (method.type !== "online") {
            throw new Error("Only online payments allowed");
        }

        console.log("providerConnection");
        console.log(providerConnection);

        const provider = await ProviderConnectionModel.findById(providerConnection);
        if (!provider || provider.isDeleted || !provider.isActive) {
            throw new Error("Invalid provider connection");
        }

        if (provider.provider !== "razorpay") {
            throw new Error("Unsupported provider");
        }

        const keyIdEncrypted = provider.credentials.get("keyId");
        const keySecretEncrypted = provider.credentials.get("keySecret");

        console.log(keyIdEncrypted);

        if (!keyIdEncrypted || !keySecretEncrypted) {
            throw new Error("Payment provider credentials not configured properly");
        }

        const keyId = provider.decryptValue(keyIdEncrypted);
        const keySecret = provider.decryptValue(keySecretEncrypted);

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const amountInPaise = amount;
        const amountInRupee = amountInPaise / 100;

        // ✅ Create Razorpay Order
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: currency || "INR",
            receipt: `txn_${Date.now()}`,
        });

        console.log(userId);
        console.log(planId);
        // ✅ Save Transaction
        const transaction = await this.repo.create({
            paymentMethod,
            providerConnection,
            amount: amountInRupee,
            currency: currency || "INR",
            externalOrderId: order.id,
            status: "pending",
            metadata: {
                userId,
                planId,
            },
        });

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: keyId,
            transactionId: transaction._id,
        };
    }

    async createOrderTransaction(data: any) {
        const { paymentMethod, providerConnection, amount, currency, userId, orderId } = data;

        console.log("paymentMethod, providerConnection, amount, currency, userId, orderId")
        console.log(paymentMethod, providerConnection, amount, currency, userId, orderId)
        if (!paymentMethod || !providerConnection || !amount || !userId) {
            throw new Error("Missing required fields");
        }

        if (amount <= 0) {
            throw new Error("Invalid amount");
        }

        const method = await PaymentMethodModel.findById(paymentMethod);
        if (!method || method.isDeleted || !method.isActive) {
            throw new Error("Invalid payment method");
        }

        if (method.type !== "online") {
            throw new Error("Only online payments allowed");
        }

        console.log("providerConnection");
        console.log(providerConnection);

        const provider = await ProviderConnectionModel.findById(providerConnection);
        if (!provider || provider.isDeleted || !provider.isActive) {
            throw new Error("Invalid provider connection");
        }

        if (provider.provider !== "razorpay") {
            throw new Error("Unsupported provider");
        }

        const keyIdEncrypted = provider.credentials.get("keyId");
        const keySecretEncrypted = provider.credentials.get("keySecret");

        console.log(keyIdEncrypted);

        if (!keyIdEncrypted || !keySecretEncrypted) {
            throw new Error("Payment provider credentials not configured properly");
        }

        const keyId = provider.decryptValue(keyIdEncrypted);
        const keySecret = provider.decryptValue(keySecretEncrypted);

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const amountInPaise = amount;
        const amountInRupee = amountInPaise / 100;

        // ✅ Create Razorpay Order
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: currency || "INR",
            receipt: `txn_${Date.now()}`,
        });

        console.log(userId);
        console.log(orderId);
        // ✅ Save Transaction
        const transaction = await this.repo.create({
            paymentMethod,
            providerConnection,
            amount: amountInRupee,
            currency: currency || "INR",
            externalOrderId: order.id,
            status: "pending",
            metadata: {
                userId,
                orderId,
            },
        });

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: keyId,
            transactionId: transaction._id,
        };
    }

    async verifyPayment(data: any) {
        const {
            transactionId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = data;

        if (!transactionId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new Error("Missing payment verification fields");
        }

        // ✅ Fetch transaction
        const transaction = await this.repo.findById(transactionId);
        if (!transaction) throw new Error("Transaction not found");

        if (transaction.status === "success") {
            throw new Error("Transaction already completed");
        }

        // ✅ Match orderId
        if (transaction.externalOrderId !== razorpay_order_id) {
            await this.repo.markFailed(transactionId);
            throw new Error("Order ID mismatch");
        }

        // ✅ Fetch provider
        const provider = await ProviderConnectionModel.findById(transaction.providerConnection);
        if (!provider) throw new Error("Provider not found");

        const keySecretEncrypted = provider.credentials.get("keySecret");
        if (!keySecretEncrypted) {
            throw new Error("Key secret missing");
        }

        const keySecret = provider.decryptValue(keySecretEncrypted);

        // ✅ Verify signature
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            await this.repo.markFailed(transactionId);
            throw new Error("Invalid payment signature");
        }

        // ✅ Extract metadata
        const { userId, planId } = transaction.metadata || {};
        if (!userId || !planId) {
            throw new Error("Missing transaction metadata");
        }

        const vendor = await VendorProfileModel.findOne({ user: userId });

        if (!vendor) {
            throw new Error("Vendor not found for this user");
        }

        // ✅ Mark success
        await this.repo.markSuccess(transactionId, razorpay_payment_id);

        // ✅ Create subscription using vendorId
        // ✅ Create subscription (inactive first)
        const subscription = await this.subscriptionService.createSubscription({
            vendor: vendor._id,
            user: userId,
            plan: planId,
            billingCycle: "monthly",
            paymentTransactionId: transactionId,
            externalPaymentId: razorpay_payment_id,
        });

        // ✅ Activate using another service
        await this.subscriptionService.activate(subscription._id);

        return {
            success: true,
            message: "Payment verified & subscription activated",
        };
    }

    async verifyOrderPayment(data: any) {
        const {
            transactionId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = data;

        if (!transactionId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new Error("Missing payment verification fields");
        }

        // ✅ Fetch transaction
        const transaction = await this.repo.findById(transactionId);
        if (!transaction) throw new Error("Transaction not found");

        if (transaction.status === "success") {
            throw new Error("Transaction already completed");
        }

        // ✅ Match orderId
        if (transaction.externalOrderId !== razorpay_order_id) {
            await this.repo.markFailed(transactionId);
            throw new Error("Order ID mismatch");
        }

        // ✅ Fetch provider
        const provider = await ProviderConnectionModel.findById(transaction.providerConnection);
        if (!provider) throw new Error("Provider not found");

        const keySecretEncrypted = provider.credentials.get("keySecret");
        if (!keySecretEncrypted) {
            throw new Error("Key secret missing");
        }

        const keySecret = provider.decryptValue(keySecretEncrypted);

        // ✅ Verify signature
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            await this.repo.markFailed(transactionId);
            throw new Error("Invalid payment signature");
        }

        const { orderId, userId } = transaction.metadata || {};
        if (!orderId || !userId) {
            throw new Error("Missing transaction metadata");
        }

        console.log("orderId, userId");
        

        const order = await this.repo.findOrderById(orderId);
        if (!order) throw new Error("Order not found");

        // optional safety check
        if (order.status !== "pending") {
            throw new Error("Order already processed");
        }

        // ✅ Mark transaction success
        await this.repo.markSuccess(transactionId, razorpay_payment_id);

        // ✅ Update order via repo
        await this.repo.markOrderPaid(orderId, transactionId);

        return {
            success: true,
            message: "Payment verified & order confirmed",
            orderId: order._id,
        };
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