import { z } from "zod";

export const createPaymentTransactionSchema = z.object({

    paymentMethod: z.string().length(24),
    providerConnection: z.string().length(24),

    amount: z.number().min(1),

    currency: z.string().optional(),

});

export const createManualDeliveryTransactionSchema = z.object({
    manualDeliveryId: z.string().length(24, "manualDeliveryId must be 24 characters"),
    paymentMethod: z.string().length(24).optional(),
    providerConnection: z.string().length(24).optional(),
    currency: z.string().optional(),
});

export const verifyManualDeliveryPaymentSchema = z.object({
    transactionId: z.string().length(24, "transactionId must be 24 characters"),
    razorpay_order_id: z.string().optional(),
    razorpay_payment_id: z.string().optional(),
    razorpay_signature: z.string().optional(),
});
