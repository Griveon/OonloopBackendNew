import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

export const addToCartSchema = z.object({
    productId: objectId,
    variantId: objectId.nullish(),
    quantity: z.number().int().positive().default(1),
});

export const updateCartQuantitySchema = z.object({
    quantity: z.number().int().positive(),
});
