import axios from "axios";
import {
    DISTANCE_CALCULATION_METHOD,
} from "../constants/manualdelivery.constants.js";
import type { IManualDeliveryDistance } from "../interfaces/manualdelivery.interface.js";

export interface ICoordinates {
    latitude: number;
    longitude: number;
}

export interface INullableCoordinates {
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
}

export class ManualDeliveryDistanceService {
    /**
     * Checks if coordinates are valid numerical latitude and longitude.
     */
    isValidCoordinate(lat: unknown, lng: unknown): boolean {
        if (typeof lat !== "number" || typeof lng !== "number") {
            return false;
        }

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return false;
        }

        // Standard geographical boundaries
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return false;
        }

        // Reject default placeholder [0, 0] unless specifically valid
        if (lat === 0 && lng === 0) {
            return false;
        }

        return true;
    }

    /**
     * Calculates the great-circle distance between two points using the Haversine formula.
     * Returns distance in meters.
     */
    calculateHaversineDistanceMeters(
        pointA: ICoordinates,
        pointB: ICoordinates
    ): number {
        const EARTH_RADIUS_METERS = 6371000;

        const dLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
        const dLng = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;

        const lat1 = (pointA.latitude * Math.PI) / 180;
        const lat2 = (pointB.latitude * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) *
                Math.cos(lat2) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }

    /**
     * Attempts to query a road routing provider (e.g. OSRM or Google Maps Distance Matrix)
     * Returns meters if successful, or null if unconfigured/failed.
     */
    async calculateRoadDistanceMeters(
        origin: ICoordinates,
        destination: ICoordinates
    ): Promise<{ meters: number; provider: string } | null> {
        // 1. Try OSRM / Custom Routing API if configured
        const osrmBaseUrl =
            process.env.ROUTING_API_URL || process.env.OSRM_ROUTING_URL;

        if (osrmBaseUrl) {
            try {
                // OSRM coordinates format is: longitude,latitude
                const url = `${osrmBaseUrl.replace(/\/$/, "")}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`;
                const response = await axios.get(url, { timeout: 3500 });

                if (
                    response.data &&
                    response.data.routes &&
                    response.data.routes[0]?.distance
                ) {
                    const distanceMeters = Math.round(
                        response.data.routes[0].distance
                    );
                    return { meters: distanceMeters, provider: "osrm" };
                }
            } catch (err: any) {
                // Silently fall through to next provider / fallback
                // (never crash or log sensitive credentials)
            }
        }

        // 2. Try Google Maps Distance Matrix API if key is configured
        const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (googleApiKey) {
            try {
                const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&key=${googleApiKey}`;
                const response = await axios.get(url, { timeout: 3500 });

                const element =
                    response.data?.rows?.[0]?.elements?.[0];

                if (
                    element &&
                    element.status === "OK" &&
                    element.distance?.value
                ) {
                    return {
                        meters: Math.round(element.distance.value),
                        provider: "google_distance_matrix",
                    };
                }
            } catch (err: any) {
                // Silently fall through to fallback
            }
        }

        return null;
    }

    /**
     * Primary distance calculation method:
     * 1. Validates coordinate presence & validity.
     * 2. Tries road routing provider first.
     * 3. Falls back to Haversine straight-line calculation.
     * 4. Returns structured distance result or null fields if coordinates are missing.
     */
    async calculateDistance(
        pickup?: INullableCoordinates | null,
        dropoff?: INullableCoordinates | null
    ): Promise<IManualDeliveryDistance> {
        const nullResult: IManualDeliveryDistance = {
            valueKm: null,
            valueMeters: null,
            calculationMethod: null,
            provider: null,
            calculatedAt: null,
        };

        if (!pickup || !dropoff) {
            return nullResult;
        }

        if (
            !this.isValidCoordinate(pickup.latitude, pickup.longitude) ||
            !this.isValidCoordinate(dropoff.latitude, dropoff.longitude)
        ) {
            return nullResult;
        }

        const validPickup: ICoordinates = {
            latitude: pickup.latitude as number,
            longitude: pickup.longitude as number,
        };

        const validDropoff: ICoordinates = {
            latitude: dropoff.latitude as number,
            longitude: dropoff.longitude as number,
        };

        // Preferred: Road distance
        try {
            const roadResult = await this.calculateRoadDistanceMeters(
                validPickup,
                validDropoff
            );

            if (roadResult && roadResult.meters >= 0) {
                const valueMeters = roadResult.meters;
                const valueKm = Math.round((valueMeters / 1000) * 100) / 100;

                return {
                    valueKm,
                    valueMeters,
                    calculationMethod: DISTANCE_CALCULATION_METHOD.ROAD,
                    provider: roadResult.provider,
                    calculatedAt: new Date(),
                };
            }
        } catch {
            // Road distance failed; proceed to Haversine fallback
        }

        // Fallback: Haversine straight-line distance
        const straightMeters = Math.round(
            this.calculateHaversineDistanceMeters(validPickup, validDropoff)
        );
        const straightKm = Math.round((straightMeters / 1000) * 100) / 100;

        return {
            valueKm: straightKm,
            valueMeters: straightMeters,
            calculationMethod: DISTANCE_CALCULATION_METHOD.STRAIGHT_LINE,
            provider: "haversine",
            calculatedAt: new Date(),
        };
    }
}
