import { z } from "zod";

export const createProviderConnectionSchema = z.object({
    storeId: z
        .string()
        .min(1, "Store ID is required"),

    provider: z.enum([
        "razorpay",
        "stripe",
        "paypal",
        "cashfree",
        "payu",
        "twilio",
        "smtp",
        "shiprocket",
        "delhivery",
    ]),

    category: z.enum(["payment", "shipping", "sms", "email"]),

    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100)
        .transform((val) => val.trim()),

    isActive: z.boolean().optional(),

    environment: z.enum(["test", "live"]).optional(),

    priority: z
        .number()
        .min(1, "Priority must be at least 1")
        .max(10)
        .optional(),

    // 🔐 Plain credentials (before encryption)
    credentials: z
        .record(z.string(), z.string())
        .optional(),

    webhook: z
        .object({
            url: z.string().url("Invalid webhook URL").optional(),
            secret: z.string().min(3).optional(),
        })
        .optional(),
});

export const updateProviderConnectionSchema = z.object({
    name: z
        .string()
        .min(2)
        .max(100)
        .transform((val) => val.trim())
        .optional(),

    isActive: z.boolean().optional(),

    environment: z.enum(["test", "live"]).optional(),

    priority: z
        .number()
        .min(1)
        .max(10)
        .optional(),

    credentials: z
        .record(z.string(), z.string())
        .optional(),

    webhook: z
        .object({
            url: z.string().url().optional(),
            secret: z.string().optional(),
        })
        .optional(),

    isDeleted: z.boolean().optional(),
}).strict();