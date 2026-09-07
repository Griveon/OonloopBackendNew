/**
 * "Buy For Me" pricing (from the app's Price Summary):
 *   Total = Shopping Budget + Service Fee + GST(18% of the fee)
 *   Unused budget is refunded after shopping.
 */
export const BFM_PRICING = {
    SERVICE_FEE: 49,
    GST_PERCENT: 18,          // GST applies to the service fee only
    BUDGET_PRESETS: [500, 1000, 2000],
    DEFAULT_RADIUS_KM: 3,
} as const;

export const BFM_SOURCE_MODES = [
    "no_preference",
    "oonloop_store",
    "named_store",
] as const;

export const BFM_ITEM_SOURCES = ["catalog", "typed", "uploaded"] as const;
