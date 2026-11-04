export const MANUAL_DELIVERY_STATUS = {
    CREATED: "CREATED",
    ASSIGNED: "ASSIGNED",
    ACCEPTED: "ACCEPTED",
    PICKED_UP: "PICKED_UP",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    REACHED: "REACHED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    FAILED: "FAILED",
} as const;

export type ManualDeliveryStatus =
    (typeof MANUAL_DELIVERY_STATUS)[keyof typeof MANUAL_DELIVERY_STATUS];

export const MANUAL_DELIVERY_PAYMENT_STATUS = {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
} as const;

export type ManualDeliveryPaymentStatus =
    (typeof MANUAL_DELIVERY_PAYMENT_STATUS)[keyof typeof MANUAL_DELIVERY_PAYMENT_STATUS];

/**
 * Manual Delivery Pricing Rules:
 * - Distance slabs:
 *     0 to 3 km      => ₹29
 *     > 3 km to 6 km => ₹49
 *     > 6 km         => ₹69
 * - Platform charges: ₹3
 * - GST: 18% applied to both delivery charge and platform charges
 */
export const MANUAL_DELIVERY_PRICING = {
    PLATFORM_FEE: 3,
    GST_PERCENT: 18,
    DEFAULT_DELIVERY_FEE: 29,
    TIERS: [
        { maxKm: 3, deliveryFee: 29 },
        { maxKm: 6, deliveryFee: 49 },
        { maxKm: Infinity, deliveryFee: 69 },
    ],
} as const;

export function calculateManualDeliveryPricing(
    distanceKm: number | null | undefined
) {
    let deliveryFee: number = MANUAL_DELIVERY_PRICING.DEFAULT_DELIVERY_FEE;

    if (
        typeof distanceKm === "number" &&
        !Number.isNaN(distanceKm) &&
        distanceKm >= 0
    ) {
        for (const tier of MANUAL_DELIVERY_PRICING.TIERS) {
            if (distanceKm <= tier.maxKm) {
                deliveryFee = tier.deliveryFee;
                break;
            }
        }
    }

    const platformFee = MANUAL_DELIVERY_PRICING.PLATFORM_FEE;
    const gstRate = MANUAL_DELIVERY_PRICING.GST_PERCENT;

    const round2 = (num: number) => Math.round(num * 100) / 100;

    const deliveryGst = round2((deliveryFee * gstRate) / 100);
    const platformGst = round2((platformFee * gstRate) / 100);
    const totalDeliveryCharge = round2(deliveryFee + deliveryGst);
    const totalPlatformCharge = round2(platformFee + platformGst);

    const subtotal = round2(deliveryFee + platformFee);
    const gstAmount = round2(deliveryGst + platformGst);
    const totalAmount = round2(subtotal + gstAmount);

    return {
        distanceKm:
            typeof distanceKm === "number" && !Number.isNaN(distanceKm)
                ? round2(distanceKm)
                : null,
        deliveryFee,
        platformFee,
        deliveryGst,
        platformGst,
        totalDeliveryCharge,
        totalPlatformCharge,
        subtotal,
        gstRate,
        gstAmount,
        totalAmount,
    };
}

export const MANUAL_DELIVERY_SOURCE = {
    PHONE_CALL: "PHONE_CALL",
    VENDOR_APP: "VENDOR_APP",
    MANUAL_ENTRY: "MANUAL_ENTRY",
} as const;

export type ManualDeliverySource =
    (typeof MANUAL_DELIVERY_SOURCE)[keyof typeof MANUAL_DELIVERY_SOURCE];

export const DISTANCE_CALCULATION_METHOD = {
    ROAD: "ROAD",
    STRAIGHT_LINE: "STRAIGHT_LINE",
} as const;

export type DistanceCalculationMethod =
    (typeof DISTANCE_CALCULATION_METHOD)[keyof typeof DISTANCE_CALCULATION_METHOD];

export const MANUAL_DELIVERY_ASSIGNMENT_ACTION = {
    ASSIGNED: "ASSIGNED",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    REASSIGNED: "REASSIGNED",
    UNASSIGNED: "UNASSIGNED",
} as const;

export type ManualDeliveryAssignmentAction =
    (typeof MANUAL_DELIVERY_ASSIGNMENT_ACTION)[keyof typeof MANUAL_DELIVERY_ASSIGNMENT_ACTION];

/**
 * Valid state machine transitions.
 * Normal workflow:
 * CREATED -> ASSIGNED -> ACCEPTED -> PICKED_UP -> OUT_FOR_DELIVERY -> REACHED -> DELIVERED
 */
export const VALID_DELIVERY_TRANSITIONS: Record<
    ManualDeliveryStatus,
    ManualDeliveryStatus[]
> = {
    CREATED: [
        MANUAL_DELIVERY_STATUS.ASSIGNED,
        MANUAL_DELIVERY_STATUS.ACCEPTED,
        MANUAL_DELIVERY_STATUS.CANCELLED,
    ],
    ASSIGNED: [
        MANUAL_DELIVERY_STATUS.ACCEPTED,
        MANUAL_DELIVERY_STATUS.CREATED, // When driver rejects, resets to CREATED for reassignment
        MANUAL_DELIVERY_STATUS.CANCELLED,
    ],
    ACCEPTED: [
        MANUAL_DELIVERY_STATUS.PICKED_UP,
        MANUAL_DELIVERY_STATUS.FAILED,
    ],
    PICKED_UP: [
        MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY,
        MANUAL_DELIVERY_STATUS.FAILED,
    ],
    OUT_FOR_DELIVERY: [
        MANUAL_DELIVERY_STATUS.REACHED,
        MANUAL_DELIVERY_STATUS.DELIVERED,
        MANUAL_DELIVERY_STATUS.FAILED,
    ],
    REACHED: [
        MANUAL_DELIVERY_STATUS.DELIVERED,
        MANUAL_DELIVERY_STATUS.FAILED,
    ],
    DELIVERED: [],
    CANCELLED: [],
    FAILED: [],
};

export const TERMINAL_STATUSES: ManualDeliveryStatus[] = [
    MANUAL_DELIVERY_STATUS.DELIVERED,
    MANUAL_DELIVERY_STATUS.CANCELLED,
    MANUAL_DELIVERY_STATUS.FAILED,
];

export const EDITABLE_STATUSES: ManualDeliveryStatus[] = [
    MANUAL_DELIVERY_STATUS.CREATED,
];

export const STATUS_DISPLAY_TITLES: Record<ManualDeliveryStatus, string> = {
    CREATED: "Delivery Created",
    ASSIGNED: "Driver Assigned",
    ACCEPTED: "Delivery Accepted by Driver",
    PICKED_UP: "Package Picked Up",
    OUT_FOR_DELIVERY: "Out for Delivery",
    REACHED: "Driver Reached Customer Location",
    DELIVERED: "Delivery Completed",
    CANCELLED: "Delivery Cancelled",
    FAILED: "Delivery Failed",
};
