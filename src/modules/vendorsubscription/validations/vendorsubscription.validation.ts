import { z } from "zod";

export const createVendorSubscriptionSchema = z.object({
    user: z
        .string()
        .length(24, "Invalid vendor ID")
        .transform(val => val.trim()),

    plan: z
        .string()
        .length(24, "Invalid plan ID")
        .transform(val => val.trim()),

    status: z
        .enum(["active", "cancelled", "expired", "pending"])
        .optional(),

    startDate: z.coerce.date(),

    endDate: z.coerce.date(),

    billingCycle: z.enum(["monthly", "yearly"]),

    autoRenew: z.boolean().optional(),

    features: z.array(
        z.object({
            feature: z
                .string()
                .length(24, "Invalid feature ID")
                .transform(val => val.trim()),

            value: z.union([z.number(), z.boolean()]),
        })
    ).optional(), // usually injected from service

    paymentTransactionId: z
        .string()
        .length(24, "Invalid payment transaction ID")
        .optional(),

    externalPaymentId: z.string().optional(),

    isActive: z.boolean().optional(),
})
    .superRefine((data, ctx) => {
        // ✅ Date validation
        if (data.startDate && data.endDate && data.startDate > data.endDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "startDate cannot be greater than endDate",
                path: ["startDate"],
            });
        }

        // ✅ If active → must have valid date range
        if (data.status === "active" && data.endDate < new Date()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Active subscription cannot have past endDate",
                path: ["endDate"],
            });
        }
    });

export const updateVendorSubscriptionSchema = z.object({
    plan: z
        .string()
        .length(24, "Invalid plan ID")
        .transform(val => val.trim())
        .optional(),

    status: z
        .enum(["active", "cancelled", "expired", "pending"])
        .optional(),

    startDate: z.coerce.date().optional(),

    endDate: z.coerce.date().optional(),

    billingCycle: z.enum(["monthly", "yearly"]).optional(),

    autoRenew: z.boolean().optional(),

    features: z.array(
        z.object({
            feature: z
                .string()
                .length(24, "Invalid feature ID")
                .transform(val => val.trim()),

            value: z.union([z.number(), z.boolean()]),
        })
    ).optional(),

    paymentTransactionId: z
        .string()
        .length(24, "Invalid payment transaction ID")
        .optional(),

    externalPaymentId: z.string().optional(),

    isActive: z.boolean().optional(),

    cancelledAt: z.coerce.date().optional(),
    expiredAt: z.coerce.date().optional(),
})
    .strict()
    .superRefine((data, ctx) => {
        if (
            data.startDate &&
            data.endDate &&
            data.startDate > data.endDate
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "startDate cannot be greater than endDate",
                path: ["startDate"],
            });
        }

        // ✅ Logical state handling
        if (data.status === "cancelled" && !data.cancelledAt) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "cancelledAt is required when status is cancelled",
                path: ["cancelledAt"],
            });
        }

        if (data.status === "expired" && !data.expiredAt) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "expiredAt is required when status is expired",
                path: ["expiredAt"],
            });
        }
    });