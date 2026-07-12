import { PersonalShopperBookingModel } from "../models/personalshopper.model.js";
import { PS_PRICING, PS_ESTIMATION } from "../constants/personalshopper.constants.js";
import type {
    IGeoPoint,
    IShopperStore,
    IEstimate,
} from "../interfaces/personalshopper.interface.js";

/** Great-circle distance between two points in kilometres. */
export function haversineKm(a: IGeoPoint, b: IGeoPoint): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    return 2 * R * Math.asin(Math.sqrt(h));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Shopper fee for a given total duration (minutes). */
export function computeShopperFee(totalMinutes: number): {
    fee: number;
    breakdown: string;
} {
    const {
        FIRST_BLOCK_MINUTES,
        FIRST_BLOCK_RATE,
        ADDITIONAL_BLOCK_MINUTES,
        ADDITIONAL_BLOCK_RATE,
    } = PS_PRICING;

    if (totalMinutes <= FIRST_BLOCK_MINUTES) {
        return { fee: FIRST_BLOCK_RATE, breakdown: `First 1 hour: ₹${FIRST_BLOCK_RATE}` };
    }

    const extra = totalMinutes - FIRST_BLOCK_MINUTES;
    const blocks = Math.ceil(extra / ADDITIONAL_BLOCK_MINUTES);
    const additional = blocks * ADDITIONAL_BLOCK_RATE;

    return {
        fee: FIRST_BLOCK_RATE + additional,
        breakdown: `First 1 hour: ₹${FIRST_BLOCK_RATE} + Additional ${blocks * ADDITIONAL_BLOCK_MINUTES} mins: ₹${additional}`,
    };
}

/**
 * Estimate travel/shopping time and the shopper fee.
 * Route: origin (optional) -> each store in order -> delivery location.
 * If no origin is given, the first store is the route start.
 */
export function computeEstimate(
    stores: IShopperStore[],
    deliveryLocation: IGeoPoint,
    origin?: IGeoPoint
): { estimate: IEstimate; storesWithLegs: IShopperStore[] } {
    const { PER_STORE_SHOPPING_MINUTES, AVG_SPEED_KMPH } = PS_ESTIMATION;

    // Build the ordered list of waypoints for distance summing.
    const points: IGeoPoint[] = [];
    if (origin) points.push(origin);
    for (const s of stores) points.push(s.location);
    points.push(deliveryLocation);

    let totalDistanceKm = 0;
    const storesWithLegs = stores.map((s, i) => {
        // leg into this store = distance from the previous waypoint
        const prev = origin ? points[i] : i === 0 ? undefined : points[i - 1];
        const legKm = prev ? haversineKm(prev, s.location) : 0;
        return { ...s, sequence: i + 1, distanceFromPrevKm: round2(legKm) };
    });

    for (let i = 0; i < points.length - 1; i++) {
        totalDistanceKm += haversineKm(points[i]!, points[i + 1]!);
    }

    const travelMinutes = Math.round((totalDistanceKm / AVG_SPEED_KMPH) * 60);
    const shoppingMinutes = stores.length * PER_STORE_SHOPPING_MINUTES;
    const totalMinutes = travelMinutes + shoppingMinutes;

    const { fee, breakdown } = computeShopperFee(totalMinutes);

    return {
        estimate: {
            travelMinutes,
            shoppingMinutes,
            totalMinutes,
            totalDistanceKm: round2(totalDistanceKm),
            shopperFee: fee,
            breakdown,
        },
        storesWithLegs,
    };
}

export interface RouteProgress {
    point: IGeoPoint;   // interpolated position
    legIndex: number;   // which leg (0-based) the point is on
    totalKm: number;    // full route length
    fraction: number;   // 0..1 along the whole route
}

/**
 * Position along a multi-stop polyline (rider → stores → customer) at a given
 * 0..1 fraction of the total route distance. `legIndex` tells which segment
 * the rider is currently on (used to derive the status/target).
 */
export function pointAlongRoute(waypoints: IGeoPoint[], fraction: number): RouteProgress {
    const f = Math.min(1, Math.max(0, fraction));

    const legs: number[] = [];
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
        const d = haversineKm(waypoints[i]!, waypoints[i + 1]!);
        legs.push(d);
        total += d;
    }

    const last = waypoints[waypoints.length - 1]!;
    if (total === 0 || waypoints.length < 2) {
        return { point: last, legIndex: Math.max(0, waypoints.length - 2), totalKm: total, fraction: f };
    }

    let target = f * total;
    for (let i = 0; i < legs.length; i++) {
        const legKm = legs[i]!;
        if (target <= legKm || i === legs.length - 1) {
            const lf = legKm === 0 ? 1 : Math.min(1, target / legKm);
            const a = waypoints[i]!;
            const b = waypoints[i + 1]!;
            return {
                point: { lat: a.lat + (b.lat - a.lat) * lf, lng: a.lng + (b.lng - a.lng) * lf },
                legIndex: i,
                totalKm: total,
                fraction: f,
            };
        }
        target -= legKm;
    }

    return { point: last, legIndex: legs.length - 1, totalKm: total, fraction: f };
}

/**
 * Project a (real) point onto the route polyline to estimate how far along it is.
 * Used when the rider app pushes live coordinates. Planar approximation — fine at
 * city scale. Returns the distance covered along the route and which leg it's on.
 */
export function projectOntoRoute(
    waypoints: IGeoPoint[],
    point: IGeoPoint
): { distanceAlongKm: number; totalKm: number; legIndex: number } {
    if (waypoints.length < 2) {
        return { distanceAlongKm: 0, totalKm: 0, legIndex: 0 };
    }

    const ref = waypoints[0]!;
    const R = 6371;
    const toXY = (p: IGeoPoint) => ({
        x: ((p.lng - ref.lng) * Math.PI) / 180 * R * Math.cos((ref.lat * Math.PI) / 180),
        y: ((p.lat - ref.lat) * Math.PI) / 180 * R,
    });

    const P = toXY(point);
    let best = { dist: Infinity, along: 0, legIndex: 0 };
    let cumulative = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const A = toXY(waypoints[i]!);
        const B = toXY(waypoints[i + 1]!);
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const legLen = Math.hypot(dx, dy);
        let t = legLen === 0 ? 0 : ((P.x - A.x) * dx + (P.y - A.y) * dy) / (legLen * legLen);
        t = Math.min(1, Math.max(0, t));
        const projX = A.x + dx * t;
        const projY = A.y + dy * t;
        const d = Math.hypot(P.x - projX, P.y - projY);
        if (d < best.dist) {
            best = { dist: d, along: cumulative + legLen * t, legIndex: i };
        }
        cumulative += legLen;
    }

    return { distanceAlongKm: best.along, totalKm: cumulative, legIndex: best.legIndex };
}

/** PSB-YYYYMMDD-NNNN booking number. */
export async function generateBookingNumber(): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    const count = await PersonalShopperBookingModel.countDocuments({
        createdAt: {
            $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
            $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`),
        },
    });

    return `PSB-${yyyy}${mm}${dd}-${String(count + 1).padStart(4, "0")}`;
}
