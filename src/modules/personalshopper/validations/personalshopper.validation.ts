import { z } from "zod";
import { SHOPPING_ASSISTANCE_OPTIONS, PS_MAX_STORES } from "../constants/personalshopper.constants.js";

const geoPoint = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});

const storeSchema = z.object({
    storeName: z.string().max(120).optional(),
    location: geoPoint,
    itemsToBuy: z.string().min(1, "Please describe what to buy"),
    image: z.string().optional(),
});

const deliverySchema = z.object({
    fullName: z.string().optional(),
    mobileNumber: z
        .string()
        .min(10, "Mobile number must be at least 10 digits")
        .max(15),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
    location: geoPoint,
});

// POST /estimate  — no auth, just needs stores + delivery location
export const estimateSchema = z.object({
    stores: z
        .array(z.object({ location: geoPoint }).passthrough())
        .min(1, "At least one store is required")
        .max(PS_MAX_STORES, `Maximum ${PS_MAX_STORES} stores allowed`),
    deliveryLocation: geoPoint,
    origin: geoPoint.optional(),
});

// POST /create
export const createBookingSchema = z.object({
    stores: z
        .array(storeSchema)
        .min(1, "At least one store is required")
        .max(PS_MAX_STORES, `Maximum ${PS_MAX_STORES} stores allowed`),
    delivery: deliverySchema,
    shoppingAssistance: z.enum(SHOPPING_ASSISTANCE_OPTIONS),
    origin: geoPoint.optional(),
});
