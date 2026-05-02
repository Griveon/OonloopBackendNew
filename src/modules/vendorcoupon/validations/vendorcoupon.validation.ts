import { z } from "zod";

export const createVendorCouponSchema = z.object({
    vendorId: z.string().length(24),

    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.number().positive(),

    minOrderValue: z.number().optional(),

    couponCode: z.string().min(3),

});

export const updateVendorCouponSchema = z.object({
    discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
    discountValue: z.number().positive().optional(),
    minOrderValue: z.number().optional(),
    isActive: z.boolean().optional(),
}).strict();