import Razorpay from "razorpay";
import crypto from "crypto";

import { PaymentTransactionRepository } from "../repositories/paymenttransaction.repository.js";
import { PaymentMethodModel } from "../../paymentmethod/models/paymentmethod.model.js";
import { ProviderConnectionModel } from "../../providerconnection/models/providerconnection.model.js";
import { VendorSubscriptionService } from "../../vendorsubscription/services/vendorsubscription.service.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";
import { FirebaseTokenService } from "../../notification/services/firebasetoken.service.js";

export class PaymentTransactionService {
    private repo: PaymentTransactionRepository;
    private subscriptionService: VendorSubscriptionService;
    private firebaseTokenService: FirebaseTokenService;

    constructor() {
        this.repo = new PaymentTransactionRepository();
        this.subscriptionService = new VendorSubscriptionService();
        this.firebaseTokenService = new FirebaseTokenService();
    }

    async createTransaction(data: any) {
        const { paymentMethod, providerConnection, amount, currency, userId, planId } = data;

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

        const provider = await ProviderConnectionModel.findById(providerConnection);

        if (!provider || provider.isDeleted || !provider.isActive) {
            throw new Error("Invalid provider connection");
        }

        if (provider.provider !== "razorpay") {
            throw new Error("Unsupported provider");
        }

        const keyIdEncrypted = provider.credentials.get("keyId");
        const keySecretEncrypted = provider.credentials.get("keySecret");

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

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: currency || "INR",
            receipt: `txn_${Date.now()}`,
        });

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

        if (!paymentMethod || !providerConnection || !amount || !userId || !orderId) {
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

        const provider = await ProviderConnectionModel.findById(providerConnection);

        if (!provider || provider.isDeleted || !provider.isActive) {
            throw new Error("Invalid provider connection");
        }

        if (provider.provider !== "razorpay") {
            throw new Error("Unsupported provider");
        }

        const keyIdEncrypted = provider.credentials.get("keyId");
        const keySecretEncrypted = provider.credentials.get("keySecret");

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

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: currency || "INR",
            receipt: `txn_${Date.now()}`,
        });

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

        if (
            !transactionId ||
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            throw new Error("Missing payment verification fields");
        }

        const transaction = await this.repo.findById(transactionId);

        if (!transaction) {
            throw new Error("Transaction not found");
        }

        if (transaction.status === "success") {
            throw new Error("Transaction already completed");
        }

        if (transaction.externalOrderId !== razorpay_order_id) {
            await this.repo.markFailed(transactionId);
            throw new Error("Order ID mismatch");
        }

        const provider = await ProviderConnectionModel.findById(transaction.providerConnection);

        if (!provider) {
            throw new Error("Provider not found");
        }

        const keySecretEncrypted = provider.credentials.get("keySecret");

        if (!keySecretEncrypted) {
            throw new Error("Key secret missing");
        }

        const keySecret = provider.decryptValue(keySecretEncrypted);

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            await this.repo.markFailed(transactionId);
            throw new Error("Invalid payment signature");
        }

        const { userId, planId } = transaction.metadata || {};

        if (!userId || !planId) {
            throw new Error("Missing transaction metadata");
        }

        const vendor = await VendorProfileModel.findOne({ user: userId });

        if (!vendor) {
            throw new Error("Vendor not found for this user");
        }

        await this.repo.markSuccess(transactionId, razorpay_payment_id);

        const subscription = await this.subscriptionService.createSubscription({
            vendor: vendor._id,
            user: userId,
            plan: planId,
            billingCycle: "monthly",
            paymentTransactionId: transactionId,
            externalPaymentId: razorpay_payment_id,
        });

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

        if (
            !transactionId ||
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            throw new Error("Missing payment verification fields");
        }

        const transaction: any = await this.repo.findById(transactionId);

        if (!transaction) {
            throw new Error("Transaction not found");
        }

        const { orderId, userId } = transaction.metadata || {};

        if (!orderId || !userId) {
            throw new Error("Missing transaction metadata");
        }

        const order: any = await this.repo.findOrderById(orderId);

        if (!order) {
            throw new Error("Order not found");
        }

        // Idempotent response: retries from the mobile app or webhook are safe.
        if (
            transaction.status === "success" ||
            order.paymentStatus === "success"
        ) {
            return {
                success: true,
                message: "Order already verified",
                alreadyProcessed: true,
                orderId: order._id,
                paymentTransaction: transaction._id,
            };
        }

        if (transaction.externalOrderId !== razorpay_order_id) {
            await this.repo.markFailed(transactionId);
            throw new Error("Razorpay order ID mismatch");
        }

        const provider: any = await ProviderConnectionModel.findById(
            transaction.providerConnection
        );

        if (!provider || provider.isDeleted || !provider.isActive) {
            throw new Error("Payment provider not available");
        }

        const keyIdEncrypted = provider.credentials.get("keyId");
        const keySecretEncrypted = provider.credentials.get("keySecret");

        if (!keyIdEncrypted || !keySecretEncrypted) {
            throw new Error("Razorpay credentials are missing");
        }

        const keyId = provider.decryptValue(keyIdEncrypted);
        const keySecret = provider.decryptValue(keySecretEncrypted);

        const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(signatureBody)
            .digest("hex");

        const expectedBuffer = Buffer.from(expectedSignature, "utf8");
        const receivedBuffer = Buffer.from(String(razorpay_signature), "utf8");

        const signatureValid =
            expectedBuffer.length === receivedBuffer.length &&
            crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

        if (!signatureValid) {
            await this.repo.markFailed(transactionId);
            throw new Error("Invalid Razorpay payment signature");
        }

        // Never trust only the mobile callback. Confirm the payment directly
        // with Razorpay before updating the order in MongoDB.
        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        let razorpayPayment: any;

        try {
            razorpayPayment = await razorpay.payments.fetch(
                razorpay_payment_id
            );
        } catch (error: any) {
            console.error("Razorpay payment fetch failed:", error?.error || error);
            throw new Error(
                "Payment was received but confirmation is temporarily unavailable. Please retry verification."
            );
        }

        if (razorpayPayment?.order_id !== razorpay_order_id) {
            await this.repo.markFailed(transactionId);
            throw new Error("Payment does not belong to this Razorpay order");
        }

        const expectedAmountInPaise = Math.round(
            Number(transaction.amount || 0) * 100
        );
        const razorpayAmountInPaise = Number(razorpayPayment?.amount || 0);

        if (
            expectedAmountInPaise <= 0 ||
            razorpayAmountInPaise !== expectedAmountInPaise
        ) {
            await this.repo.markFailed(transactionId);
            throw new Error("Payment amount mismatch");
        }

        const expectedCurrency = String(transaction.currency || "INR").toUpperCase();
        const razorpayCurrency = String(
            razorpayPayment?.currency || ""
        ).toUpperCase();

        if (razorpayCurrency !== expectedCurrency) {
            await this.repo.markFailed(transactionId);
            throw new Error("Payment currency mismatch");
        }

        // In rare cases Checkout returns while payment is only authorized.
        // Capture it from the server and then continue only after capture.
        if (razorpayPayment.status === "authorized") {
            try {
                razorpayPayment = await razorpay.payments.capture(
                    razorpay_payment_id,
                    expectedAmountInPaise,
                    expectedCurrency
                );
            } catch (error: any) {
                // It may have been auto-captured between fetch and capture.
                razorpayPayment = await razorpay.payments.fetch(
                    razorpay_payment_id
                );
            }
        }

        if (razorpayPayment?.status !== "captured") {
            throw new Error(
                `Payment is not captured yet. Current Razorpay status: ${razorpayPayment?.status || "unknown"
                }`
            );
        }

        // Update transaction first, then the parent/vendor orders.
        // Repository methods should themselves use atomic MongoDB updates.
        await this.repo.markSuccess(transactionId, razorpay_payment_id);
        await this.repo.markOrderPaid(orderId, transactionId);

        // Notifications must never decide whether payment verification succeeds.
        void Promise.allSettled([
            this.sendOrderPaidNotificationToVendors(orderId),
            this.sendOrderPaidNotificationToDrivers(orderId),
        ]);

        return {
            success: true,
            message: "Payment verified & order confirmed",
            alreadyProcessed: false,
            orderId: order._id,
            paymentTransaction: transaction._id,
            razorpayPaymentId: razorpay_payment_id,
        };
    }

    async getAll() {
        return await this.repo.findAll();
    }

    async getById(id: string) {
        const item = await this.repo.findById(id);

        if (!item) {
            throw new Error("Transaction not found");
        }

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

    private async sendOrderPaidNotificationToDrivers(parentOrderId: any) {
        try {
            if (!parentOrderId) {
                console.log("Driver push skipped: parentOrderId missing");
                return;
            }

            const vendorOrders: any[] = await OrderVendorModel.find({
                parentOrder: parentOrderId,
                isActive: true,
            })
                .select(
                    "_id orderNumber vendorOrderNumber totalAmount paymentStatus"
                )
                .lean();

            if (!vendorOrders.length) {
                console.log(
                    "Driver push skipped: no vendor orders found"
                );
                return;
            }

            const paidVendorOrders = vendorOrders.filter(
                (item: any) => item?.paymentStatus === "success"
            );

            const ordersForNotification = paidVendorOrders.length
                ? paidVendorOrders
                : vendorOrders;

            const firstVendorOrder = ordersForNotification[0];

            const orderNumber =
                firstVendorOrder?.orderNumber?.toString?.() || "";

            const title = "New delivery order available";

            const body = orderNumber
                ? `Paid order ${orderNumber} is ready for a driver. Open available orders to take it.`
                : "A new paid delivery order is available. Open available orders to take it.";

            const result =
                await this.firebaseTokenService.sendDataNotificationToRole({
                    role: "driver",
                    title,
                    body,
                    data: {
                        type: "DRIVER_NEW_PAID_ORDER",
                        screen: "DRIVER_AVAILABLE_ORDERS",
                        parentOrderId: parentOrderId.toString(),
                        orderNumber,
                        vendorOrderCount:
                            ordersForNotification.length.toString(),
                        sound: "order_alert",
                        channelId: "new_paid_orders_v1",
                    },
                });

            console.log(
                "Driver paid-order push completed:",
                result
            );
        } catch (error: any) {
            console.log(
                "Driver paid-order push error:",
                error?.message || error
            );
        }
    }

    private async sendOrderPaidNotificationToVendors(parentOrderId: any) {
        try {
            if (!parentOrderId) {
                console.log("Vendor push skipped: parentOrderId missing");
                return;
            }

            const vendorOrders: any[] = await OrderVendorModel.find({
                parentOrder: parentOrderId,
                isActive: true,
            })
                .select("_id vendor orderNumber vendorOrderNumber totalAmount")
                .lean();

            if (!vendorOrders || vendorOrders.length === 0) {
                console.log("Vendor push skipped: no vendor orders found");
                return;
            }

            const vendorIds = [
                ...new Set(
                    vendorOrders
                        .map((item: any) => item?.vendor?.toString?.())
                        .filter(Boolean)
                ),
            ];

            if (vendorIds.length === 0) {
                console.log("Vendor push skipped: vendor ids not found");
                return;
            }

            const firstVendorOrder = vendorOrders[0];

            const title = "New paid order received";

            const body = firstVendorOrder?.orderNumber
                ? `Order ${firstVendorOrder.orderNumber} has been paid successfully. Please accept and process it.`
                : "A new order has been paid successfully. Please accept and process it.";

            const failedVendorIds: string[] = [];

            for (const vendorId of vendorIds) {
                try {
                    await this.firebaseTokenService.sendNotificationToUser({
                        userId: vendorId,
                        title,
                        body,
                        data: {
                            type: "ORDER_PAYMENT_SUCCESS",
                            screen: "VENDOR_ORDER_DETAILS",
                            parentOrderId: parentOrderId.toString(),
                            orderNumber:
                                firstVendorOrder?.orderNumber?.toString?.() || "",
                            vendorOrderCount: vendorOrders.length.toString(),
                            click_action: "FLUTTER_NOTIFICATION_CLICK",
                        },
                    });
                } catch (error: any) {
                    failedVendorIds.push(vendorId);

                    console.log(
                        "Vendor push failed for vendor:",
                        vendorId,
                        error.message
                    );
                }
            }

            console.log("Vendor order payment push completed", {
                totalVendors: vendorIds.length,
                failedVendors: failedVendorIds.length,
            });
        } catch (error: any) {
            console.log("Vendor order payment push error:", error.message);
        }
    }
}