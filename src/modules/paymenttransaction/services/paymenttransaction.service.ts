import Razorpay from "razorpay";
import crypto from "crypto";

import { PaymentTransactionRepository } from "../repositories/paymenttransaction.repository.js";
import { PaymentMethodModel } from "../../paymentmethod/models/paymentmethod.model.js";
import { ProviderConnectionModel } from "../../providerconnection/models/providerconnection.model.js";
import { VendorSubscriptionService } from "../../vendorsubscription/services/vendorsubscription.service.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";
import { FirebaseTokenService } from "../../notification/services/firebasetoken.service.js";
import mongoose from "mongoose";
import { CartModel } from "../../cart/models/cart.model.js";

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

        // orderId required (both real + demo need it); providerConnection is
        // validated later so the demo path (no gateway) can skip it.
        if (!paymentMethod || !amount || !userId || !orderId) {
            throw new Error("Missing required fields");
        }

        if (amount <= 0) {
            throw new Error("Invalid amount");
        }

        const method = await PaymentMethodModel.findById(paymentMethod);

        if (!method || method.isDeleted || !method.isActive) {
            throw new Error("Invalid payment method");
        }

        // ----- DEV-ONLY demo payment: no gateway; confirmed at /verifyorder -----
        if ((method as any).isDemo) {
            if (process.env.ALLOW_DEMO_PAYMENT !== "true") {
                throw new Error("Demo payment is not enabled");
            }
            const stamp = Date.now();
            const txn = await this.repo.create({
                paymentMethod,
                amount: amount / 100,
                currency: currency || "INR",
                externalOrderId: `DEMO-${stamp}`,
                status: "pending",
                metadata: { userId, orderId, demo: true },
            });
            return {
                orderId: `DEMO-${stamp}`,
                amount,
                currency: currency || "INR",
                key: "demo",
                transactionId: txn._id,
                demo: true,
            };
        }

        if (!providerConnection) {
            throw new Error("Missing required fields");
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

    async createBookingTransaction(data: any) {
        const { paymentMethod, providerConnection, userId, bookingId, currency } = data;

        if (!paymentMethod || !userId || !bookingId) {
            throw new Error("Missing required fields");
        }

        // Amount is derived from the booking (server-authoritative — not client-sent).
        const booking = await this.repo.findBookingById(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (booking.paymentStatus === "paid") {
            throw new Error("Booking already paid");
        }

        const feeRupees = booking.estimate?.shopperFee;
        if (!feeRupees || feeRupees <= 0) {
            throw new Error("Invalid booking fee");
        }
        const amountInPaise = Math.round(feeRupees * 100);

        const method = await PaymentMethodModel.findById(paymentMethod);
        if (!method || method.isDeleted || !method.isActive) {
            throw new Error("Invalid payment method");
        }

        // ----- DEV-ONLY demo payment: no gateway; confirmed at /verifybooking -----
        if ((method as any).isDemo) {
            if (process.env.ALLOW_DEMO_PAYMENT !== "true") {
                throw new Error("Demo payment is not enabled");
            }
            const stamp = Date.now();
            const txn = await this.repo.create({
                paymentMethod,
                amount: amountInPaise / 100,
                currency: currency || "INR",
                externalOrderId: `DEMO-${stamp}`,
                status: "pending",
                metadata: { userId, bookingId, type: "personal_shopper", demo: true },
            });

            // Same shape as a real createbooking so the app's flow is unchanged;
            // it then calls /verifybooking (with placeholder values) to confirm.
            return {
                orderId: `DEMO-${stamp}`,
                amount: amountInPaise,
                currency: currency || "INR",
                key: "demo",
                transactionId: txn._id,
                demo: true,
            };
        }

        if (!providerConnection) {
            throw new Error("Missing required fields");
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

        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: currency || "INR",
            receipt: `psb_${Date.now()}`,
        });

        const transaction = await this.repo.create({
            paymentMethod,
            providerConnection,
            amount: amountInPaise / 100,
            currency: currency || "INR",
            externalOrderId: order.id,
            status: "pending",
            metadata: {
                userId,
                bookingId,
                type: "personal_shopper",
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

    async verifyBookingPayment(data: any) {
        const {
            transactionId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = data;

        if (!transactionId || !razorpay_payment_id || !razorpay_signature) {
            throw new Error("Missing payment verification fields");
        }

        const transaction = await this.repo.findById(transactionId);
        if (!transaction) throw new Error("Transaction not found");
        if (transaction.status === "success") {
            throw new Error("Transaction already completed");
        }

        // ----- DEV-ONLY demo: confirm without signature check -----
        // Only a transaction that was itself created as a demo can be confirmed
        // this way, so real transactions can't be confirmed with placeholder values.
        if ((transaction.metadata as any)?.demo === true) {
            if (process.env.ALLOW_DEMO_PAYMENT !== "true") {
                throw new Error("Demo payment is not enabled");
            }
            const { bookingId: demoBookingId } = transaction.metadata || {};
            if (!demoBookingId) throw new Error("Missing transaction metadata");
            const demoBooking = await this.repo.findBookingById(demoBookingId);
            if (!demoBooking) throw new Error("Booking not found");

            await this.repo.markSuccess(transactionId, razorpay_payment_id || `DEMO-PAY-${Date.now()}`);
            await this.repo.markBookingPaid(demoBookingId, transactionId);

            return {
                success: true,
                message: "Payment verified & booking confirmed",
                bookingId: demoBooking._id,
            };
        }

        if (transaction.externalOrderId !== razorpay_order_id) {
            await this.repo.markFailed(transactionId);
            throw new Error("Order ID mismatch");
        }

        const provider = await ProviderConnectionModel.findById(transaction.providerConnection);
        if (!provider) throw new Error("Provider not found");

        const keySecretEncrypted = provider.credentials.get("keySecret");
        if (!keySecretEncrypted) throw new Error("Key secret missing");

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

        const { bookingId } = transaction.metadata || {};
        if (!bookingId) throw new Error("Missing transaction metadata");

        const booking = await this.repo.findBookingById(bookingId);
        if (!booking) throw new Error("Booking not found");

        await this.repo.markSuccess(transactionId, razorpay_payment_id);
        await this.repo.markBookingPaid(bookingId, transactionId);

        return {
            success: true,
            message: "Payment verified & booking confirmed",
            bookingId: booking._id,
        };
    }

    async createPreorderTransaction(data: any) {
        const { paymentMethod, providerConnection, userId, preorderId, currency } = data;

        if (!paymentMethod || !userId || !preorderId) {
            throw new Error("Missing required fields");
        }

        // Amount is derived from the preorder (server-authoritative).
        const preorder: any = await this.repo.findPreorderById(preorderId);
        if (!preorder) throw new Error("Preorder not found");
        if (preorder.paymentStatus === "success") {
            throw new Error("Preorder already paid");
        }
        // Only the preorder's owner can pay for it.
        if (preorder.user?.toString() !== userId) {
            throw new Error("Not allowed");
        }

        const totalRupees = Number(preorder.totalAmount);
        if (!totalRupees || totalRupees <= 0) {
            throw new Error("Invalid preorder amount");
        }
        const amountInPaise = Math.round(totalRupees * 100);

        const method = await PaymentMethodModel.findById(paymentMethod);
        if (!method || method.isDeleted || !method.isActive) {
            throw new Error("Invalid payment method");
        }

        // ----- DEV-ONLY demo payment: no gateway; confirmed at /verifypreorder -----
        if ((method as any).isDemo) {
            if (process.env.ALLOW_DEMO_PAYMENT !== "true") {
                throw new Error("Demo payment is not enabled");
            }
            const stamp = Date.now();
            const txn = await this.repo.create({
                paymentMethod,
                amount: amountInPaise / 100,
                currency: currency || "INR",
                externalOrderId: `DEMO-${stamp}`,
                status: "pending",
                metadata: { userId, preorderId, type: "preorder", demo: true },
            });
            return {
                orderId: `DEMO-${stamp}`,
                amount: amountInPaise,
                currency: currency || "INR",
                key: "demo",
                transactionId: txn._id,
                demo: true,
            };
        }

        if (!providerConnection) {
            throw new Error("Missing required fields");
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

        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: currency || "INR",
            receipt: `pre_${Date.now()}`,
        });

        const transaction = await this.repo.create({
            paymentMethod,
            providerConnection,
            amount: amountInPaise / 100,
            currency: currency || "INR",
            externalOrderId: order.id,
            status: "pending",
            metadata: {
                userId,
                preorderId,
                type: "preorder",
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

    async verifyPreorderPayment(data: any) {
        const {
            transactionId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = data;

        if (!transactionId || !razorpay_payment_id || !razorpay_signature) {
            throw new Error("Missing payment verification fields");
        }

        const transaction = await this.repo.findById(transactionId);
        if (!transaction) throw new Error("Transaction not found");
        if (transaction.status === "success") {
            throw new Error("Transaction already completed");
        }

        // ----- DEV-ONLY demo: confirm without signature check -----
        if ((transaction.metadata as any)?.demo === true) {
            if (process.env.ALLOW_DEMO_PAYMENT !== "true") {
                throw new Error("Demo payment is not enabled");
            }
            const { preorderId: demoPreorderId } = transaction.metadata || {};
            if (!demoPreorderId) throw new Error("Missing transaction metadata");
            const demoPreorder = await this.repo.findPreorderById(demoPreorderId);
            if (!demoPreorder) throw new Error("Preorder not found");

            await this.repo.markSuccess(transactionId, razorpay_payment_id || `DEMO-PAY-${Date.now()}`);
            await this.repo.markPreorderPaid(demoPreorderId, transactionId);

            return {
                success: true,
                message: "Payment verified & preorder confirmed",
                preorderId: demoPreorder._id,
            };
        }

        if (transaction.externalOrderId !== razorpay_order_id) {
            await this.repo.markFailed(transactionId);
            throw new Error("Order ID mismatch");
        }

        const provider = await ProviderConnectionModel.findById(transaction.providerConnection);
        if (!provider) throw new Error("Provider not found");

        const keySecretEncrypted = provider.credentials.get("keySecret");
        if (!keySecretEncrypted) throw new Error("Key secret missing");

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

        const { preorderId } = transaction.metadata || {};
        if (!preorderId) throw new Error("Missing transaction metadata");

        const preorder = await this.repo.findPreorderById(preorderId);
        if (!preorder) throw new Error("Preorder not found");

        await this.repo.markSuccess(transactionId, razorpay_payment_id);
        await this.repo.markPreorderPaid(preorderId, transactionId);

        return {
            success: true,
            message: "Payment verified & preorder confirmed",
            preorderId: preorder._id,
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

    async removeOrderedItemsFromCart(
        userId: string | mongoose.Types.ObjectId,
        orderItems: any[]
    ) {
        if (!userId || !Array.isArray(orderItems) || orderItems.length === 0) {
            return;
        }

        const conditions = orderItems
            .filter((item) => item?.product)
            .map((item) => {
                const condition: any = {
                    product: new mongoose.Types.ObjectId(
                        item.product.toString()
                    ),
                };

                // If the order item has a variant, match that exact variant.
                if (item.variant) {
                    condition.variant = new mongoose.Types.ObjectId(
                        item.variant.toString()
                    );
                } else {
                    // Product without variant
                    condition.$or = [
                        { variant: null },
                        { variant: { $exists: false } },
                    ];
                }

                return condition;
            });

        if (conditions.length === 0) {
            return;
        }

        await CartModel.updateOne(
            {
                user: new mongoose.Types.ObjectId(userId.toString()),
            },
            {
                $pull: {
                    items: {
                        $or: conditions,
                    },
                },
            }
        );

        // Recalculate cart totals after removing purchased items.
        const cart = await CartModel.findOne({
            user: new mongoose.Types.ObjectId(userId.toString()),
        });

        if (!cart) {
            return;
        }

        cart.totalItems = cart.items.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
        );

        cart.subTotal = cart.items.reduce(
            (sum, item) =>
                sum + Number(item.price || 0) * Number(item.quantity || 0),
            0
        );

        cart.totalGST = cart.items.reduce(
            (sum, item) => sum + Number(item.gstAmount || 0),
            0
        );

        cart.grandTotal = cart.subTotal + cart.totalGST;

        await cart.save();
    }

    async verifyOrderPayment(data: any) {
        const {
            transactionId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = data;

        if (!transactionId || !razorpay_payment_id || !razorpay_signature) {
            throw new Error("Missing payment verification fields");
        }

        const transaction: any = await this.repo.findById(transactionId);

        if (!transaction) {
            throw new Error("Transaction not found");
        }

        // ----- DEV-ONLY demo: confirm without signature check -----
        if ((transaction.metadata as any)?.demo === true) {
            if (process.env.ALLOW_DEMO_PAYMENT !== "true") {
                throw new Error("Demo payment is not enabled");
            }
            const { orderId: demoOrderId } = transaction.metadata || {};
            if (!demoOrderId) throw new Error("Missing transaction metadata");
            const demoOrder = await this.repo.findOrderById(demoOrderId);
            if (!demoOrder) throw new Error("Order not found");
            if (demoOrder.status !== "pending") {
                throw new Error("Order already processed");
            }
            await this.repo.markSuccess(transactionId, razorpay_payment_id || `DEMO-PAY-${Date.now()}`);
            await this.repo.markOrderPaid(demoOrderId, transactionId);
            return {
                success: true,
                message: "Payment verified & order confirmed",
                orderId: demoOrder._id,
            };
        }

        // ✅ Match orderId
        if (transaction.externalOrderId !== razorpay_order_id) {
            await this.repo.markFailed(transactionId);
            throw new Error("Order ID mismatch");
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

        await this.repo.markSuccess(transactionId, razorpay_payment_id);
        await this.repo.markOrderPaid(orderId, transactionId);

        await this.removeOrderedItemsFromCart(
            userId,
            order.items
        );

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