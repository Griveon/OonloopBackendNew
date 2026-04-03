import { z } from "zod";

export const createCurrencySchema = z.object({
    code: z.string()
        .min(2)
        .max(10)
        .regex(/^[A-Z]{2,5}$/, "Currency code must be uppercase letters")
        .transform(val => val.toUpperCase().trim()),

    symbol: z.string()
        .min(1)
        .max(5),

    name: z.string()
        .min(2)
        .max(50)
        .transform(val => val.trim()),

    isActive: z.boolean().optional(),
});

export const updateCurrencySchema = z.object({
    code: z.string()
        .min(2)
        .max(10)
        .regex(/^[A-Z]{2,5}$/, "Currency code must be uppercase letters")
        .transform(val => val.toUpperCase().trim())
        .optional(),

    symbol: z.string()
        .min(1)
        .max(5)
        .optional(),

    name: z.string()
        .min(2)
        .max(50)
        .transform(val => val.trim())
        .optional(),

    isActive: z.boolean().optional(),
}).strict();