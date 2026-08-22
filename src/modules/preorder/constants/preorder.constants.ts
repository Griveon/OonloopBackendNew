export const PREORDER_FULFILLMENT_MODES = ["same_day", "scheduled"] as const;
export type PreorderFulfillmentMode = (typeof PREORDER_FULFILLMENT_MODES)[number];

export const PREORDER_ORDER_STATUSES = [
    "pending_payment",
    "placed",
    "preparing",
    "ready",
    "out_for_delivery",
    "delivered",
    "cancelled",
] as const;
export type PreorderOrderStatus = (typeof PREORDER_ORDER_STATUSES)[number];

export const PREORDER_PAYMENT_STATUSES = [
    "pending",
    "success",
    "failed",
    "refunded",
] as const;
export type PreorderPaymentStatus = (typeof PREORDER_PAYMENT_STATUSES)[number];

// Statuses a rider/seller treats as "still in progress".
export const PREORDER_ACTIVE_STATUSES = [
    "placed",
    "preparing",
    "ready",
    "out_for_delivery",
] as const;

// Charges — mirrors the normal order summary (platform fee + GST on the fee,
// delivery fee shown for display only). No coupons on preorders for v1.
export const PREORDER_CHARGES = {
    PLATFORM_FEE: 7,
    GST_RATE: 18,
    DELIVERY_FEE: 49, // display only, NOT added to payable
};

// Default booking horizon when a seller leaves scheduled.horizonDays unset.
export const PREORDER_DEFAULT_HORIZON_DAYS = 7;
