import { z } from "zod";

const objectId = z.string().length(24, "Invalid ObjectId");

export const createWorkspaceSubscriptionSchema = z.object({

    workspace: objectId,

    plan: objectId,

    status: z
        .enum(["active", "cancelled", "expired", "pending"])
        .optional()
        .default("active"),

    startDate: z
        .string()
        .refine(Date.parse, { message: "Invalid start date format" })
        .optional(),

    endDate: z
        .string()
        .refine(Date.parse, { message: "Invalid end date format" })
        .optional(),

    autoRenew: z.boolean().optional().default(true),

    paymentId: z.string().optional(),

    isActive: z.boolean().optional().default(true),
});
export const updateWorkspaceSubscriptionSchema = z.object({
    plan: objectId.optional(),

    status: z
        .enum(["active", "cancelled", "expired", "pending"])
        .optional(),

    startDate: z
        .string()
        .refine(Date.parse, { message: "Invalid start date format" })
        .optional(),

    endDate: z
        .string()
        .refine(Date.parse, { message: "Invalid end date format" })
        .optional(),

    autoRenew: z.boolean().optional(),

    paymentId: z.string().optional(),

    isActive: z.boolean().optional(),
}).strict();