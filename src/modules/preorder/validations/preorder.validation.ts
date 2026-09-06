import { z } from "zod";
import { PREORDER_FULFILLMENT_MODES } from "../constants/preorder.constants.js";

const geoPoint = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});

const slotSchema = z.object({
    label: z.string().min(1, "Slot label is required"),
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "start must be HH:mm"),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "end must be HH:mm"),
});

// POST /preorder/config/:productId  (seller)
export const upsertConfigSchema = z.object({
    isActive: z.boolean().optional(),
    sameDay: z
        .object({
            enabled: z.boolean().optional(),
            readyWithinHours: z.number().positive().optional(),
            cutoffTime: z
                .string()
                .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "cutoffTime must be HH:mm")
                .or(z.literal(""))
                .optional(),
        })
        .optional(),
    scheduled: z
        .object({
            enabled: z.boolean().optional(),
            minLeadDays: z.number().int().min(0).optional(),
            horizonDays: z.number().int().min(1).optional(),
            slots: z.array(slotSchema).optional(),
        })
        .optional(),
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

// POST /preorder/order  (customer)
export const createOrderSchema = z
    .object({
        items: z
            .array(
                z.object({
                    productId: z.string().min(1),
                    variantId: z.string().optional(),
                    qty: z.number().int().positive(),
                })
            )
            .min(1, "At least one item is required"),
        fulfillmentMode: z.enum(PREORDER_FULFILLMENT_MODES),
        scheduledDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "scheduledDate must be YYYY-MM-DD")
            .optional(),
        slotLabel: z.string().optional(),
        delivery: deliverySchema,
    })
    .refine(
        (v) =>
            v.fulfillmentMode !== "scheduled" ||
            (!!v.scheduledDate && !!v.slotLabel),
        {
            message:
                "scheduledDate and slotLabel are required for scheduled delivery",
            path: ["scheduledDate"],
        }
    );
