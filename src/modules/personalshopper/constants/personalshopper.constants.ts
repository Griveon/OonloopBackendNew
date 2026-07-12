/**
 * Personal Shopper pricing & estimation policy.
 *
 * Fee (matches the app's "Estimated Cost Summary" screen):
 *   - First 60 minutes            => ₹250
 *   - Every additional 30 minutes => ₹100  (charged per block / part thereof)
 *   e.g. 80 mins = 250 + ceil(20/30)*100 = ₹350
 *
 * Time:
 *   - Shopping: PER_STORE_SHOPPING_MINUTES per store
 *   - Travel:   total route distance / AVG_SPEED_KMPH
 */
export const PS_PRICING = {
    FIRST_BLOCK_MINUTES: 60,
    FIRST_BLOCK_RATE: 250,
    ADDITIONAL_BLOCK_MINUTES: 30,
    ADDITIONAL_BLOCK_RATE: 100,
} as const;

export const PS_ESTIMATION = {
    PER_STORE_SHOPPING_MINUTES: 15,
    AVG_SPEED_KMPH: 20,
} as const;

export const PS_MAX_STORES = 5;

// Delivery-tracking demo timings
export const PS_TRACKING = {
    FINDING_RIDER_SECONDS: 8,       // "checking available riders…" window before assign
    ROUTE_DURATION_SECONDS: 180,    // demo: 3 min to cover the WHOLE route (rider→shops→customer)
    LIVE_AVG_SPEED_KMPH: 20,        // used only to estimate ETA from real rider coords
} as const;

export const SHOPPING_ASSISTANCE_OPTIONS = [
    "call",
    "video_call",
    "instructions_only",
] as const;
