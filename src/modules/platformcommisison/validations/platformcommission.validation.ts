import { z } from "zod";

export const createPlatformCommissionSchema = z.object({

    type: z.enum(["percentage", "fixed"]),

    value: z.number().min(0),

    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),

    notes: z.string().optional(),
});

export const updatePlatformCommissionSchema = z.object({
    type: z.enum(["percentage", "fixed"]).optional(),
    value: z.number().min(0).optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().optional(),
}).strict();