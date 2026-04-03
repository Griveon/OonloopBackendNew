import { z } from "zod";

export const createPaymentTransactionSchema = z.object({

    paymentMethod: z.string().length(24),
    providerConnection: z.string().length(24),

    amount: z.number().min(1),

    currency: z.string().optional(),

});