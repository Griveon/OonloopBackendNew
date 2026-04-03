import { z } from "zod";

export const createPaymentMethodSchema = z.object({

    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100)
        .transform((val) => val.trim()),

    type: z.enum(["cod", "online"]),

    providerConnectionId: z.string().optional(),

    isActive: z.boolean().optional(),

    priority: z.number().min(1).optional(),

    charges: z
        .object({
            type: z.enum(["percentage", "flat"]),
            value: z.number().min(0),
        })
        .optional(),

    rules: z
        .object({
            minAmount: z.number().min(0).optional(),
            maxAmount: z.number().min(0).optional(),
            allowedPincodes: z.array(z.string()).optional(),
            blockedPincodes: z.array(z.string()).optional(),
        })
        .optional(),

})
    .superRefine((data, ctx) => {

        if (data.type === "online" && !data.providerConnectionId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "providerConnectionId is required for online payment",
                path: ["providerConnectionId"],
            });
        }

        if (data.type === "cod" && data.providerConnectionId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "providerConnectionId should not be provided for COD",
                path: ["providerConnectionId"],
            });
        }

        if (
            data.rules?.minAmount &&
            data.rules?.maxAmount &&
            data.rules.minAmount > data.rules.maxAmount
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "minAmount cannot be greater than maxAmount",
                path: ["rules", "minAmount"],
            });
        }
    });

export const updatePaymentMethodSchema = z
    .object({
        name: z
            .string()
            .min(2)
            .max(100)
            .transform((val) => val.trim())
            .optional(),

        type: z.enum(["cod", "online"]).optional(),

        providerConnectionId: z.string().optional(),

        isActive: z.boolean().optional(),

        priority: z.number().min(1).optional(),

        charges: z
            .object({
                type: z.enum(["percentage", "flat"]),
                value: z.number().min(0),
            })
            .optional(),

        rules: z
            .object({
                minAmount: z.number().min(0).optional(),
                maxAmount: z.number().min(0).optional(),
                allowedPincodes: z.array(z.string()).optional(),
                blockedPincodes: z.array(z.string()).optional(),
            })
            .optional(),

    })
    .strict()
    .superRefine((data, ctx) => {
        // same validations but conditional (only if fields exist)

        if (
            data.type === "online" &&
            "providerConnectionId" in data &&
            !data.providerConnectionId
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "providerConnectionId is required for online payment",
                path: ["providerConnectionId"],
            });
        }

        if (
            data.type === "cod" &&
            data.providerConnectionId
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "COD should not have providerConnectionId",
                path: ["providerConnectionId"],
            });
        }

        if (
            data.rules?.minAmount &&
            data.rules?.maxAmount &&
            data.rules.minAmount > data.rules.maxAmount
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "minAmount cannot be greater than maxAmount",
                path: ["rules", "minAmount"],
            });
        }
    });