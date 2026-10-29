import axios from "axios";

export interface ICoordinates {
    latitude: number;
    longitude: number;
}

/**
 * Validates geographical latitude and longitude values.
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
    if (typeof lat !== "number" || typeof lng !== "number") {
        return false;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return false;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return false;
    }
    if (lat === 0 && lng === 0) {
        return false;
    }
    return true;
}

/**
 * Extracts coordinates from an expanded Google Maps URL string, query string, or fragment.
 */
export function extractCoordinatesFromUrlString(
    urlString: string
): ICoordinates | null {
    if (!urlString || typeof urlString !== "string") {
        return null;
    }

    let decoded = urlString;
    try {
        decoded = decodeURIComponent(urlString);
    } catch {
        // Fall back to undecoded string if invalid percent-encoding
    }

    // 1. Fragment coordinates with @lat,lng (e.g. /@12.971598,77.594562 or /@12.971598,77.594562,15z)
    const atRegex = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
    const atMatch = decoded.match(atRegex);
    if (atMatch && atMatch[1] && atMatch[2]) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        if (isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
        }
    }

    // 2. Google Maps place data format: !3d<lat>!4d<lng> (3d = latitude, 4d = longitude)
    const data3d4dRegex = /!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/;
    const match3d4d = decoded.match(data3d4dRegex);
    if (match3d4d && match3d4d[1] && match3d4d[2]) {
        const lat = parseFloat(match3d4d[1]);
        const lng = parseFloat(match3d4d[2]);
        if (isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
        }
    }

    // Also check inverted !4d<lng>!3d<lat>
    const data4d3dRegex = /!4d(-?\d+(?:\.\d+)?).*?!3d(-?\d+(?:\.\d+)?)/;
    const match4d3d = decoded.match(data4d3dRegex);
    if (match4d3d && match4d3d[1] && match4d3d[2]) {
        const lng = parseFloat(match4d3d[1]);
        const lat = parseFloat(match4d3d[2]);
        if (isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
        }
    }

    // 3. Dropoff destination parameter (daddr or destination)
    const destRegex =
        /[?&](?:destination|daddr)=(-?\d+(?:\.\d+)?)(?:,|%2C|\+)(-?\d+(?:\.\d+)?)/i;
    const destMatch = decoded.match(destRegex);
    if (destMatch && destMatch[1] && destMatch[2]) {
        const lat = parseFloat(destMatch[1]);
        const lng = parseFloat(destMatch[2]);
        if (isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
        }
    }

    // 4. Standard query parameters (q, query, ll, center, loc, sll)
    const queryRegex =
        /[?&](?:q|query|ll|center|loc|sll)=(-?\d+(?:\.\d+)?)(?:,|%2C|\+)(-?\d+(?:\.\d+)?)/i;
    const queryMatch = decoded.match(queryRegex);
    if (queryMatch && queryMatch[1] && queryMatch[2]) {
        const lat = parseFloat(queryMatch[1]);
        const lng = parseFloat(queryMatch[2]);
        if (isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
        }
    }

    // 5. Path coordinates e.g. /maps/place/12.971598,77.594562 or /maps/search/12.971598+77.594562
    const pathRegex =
        /\/(?:place|search|dir)\/(-?\d+(?:\.\d+)?)(?:,|%2C|\+)(-?\d+(?:\.\d+)?)/i;
    const pathMatch = decoded.match(pathRegex);
    if (pathMatch && pathMatch[1] && pathMatch[2]) {
        const lat = parseFloat(pathMatch[1]);
        const lng = parseFloat(pathMatch[2]);
        if (isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
        }
    }

    // 6. Generic coordinates pattern: lat, lng (at least 3 decimal places)
    const genericRegex =
        /(?:^|[^\d.-])(-?\d{1,2}\.\d{3,})(?:,|%2C|\s+|\+)(-?\d{1,3}\.\d{3,})(?:[^\d.-]|$)/;
    const genericMatch = decoded.match(genericRegex);
    if (genericMatch && genericMatch[1] && genericMatch[2]) {
        const lat = parseFloat(genericMatch[1]);
        const lng = parseFloat(genericMatch[2]);
        if (isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
        }
    }

    return null;
}

/**
 * Extracts coordinates from an HTML response body if present in metadata, canonical, or script tags.
 */
export function extractCoordinatesFromHtml(html: string): ICoordinates | null {
    if (!html || typeof html !== "string") {
        return null;
    }

    // 1. Meta og:url or canonical URL
    const metaUrlRegex =
        /<meta\s+[^>]*(?:property=["']og:url["']|itemprop=["']image["']|name=["']twitter:image["'])[^>]*content=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = metaUrlRegex.exec(html)) !== null) {
        if (match[1]) {
            const coords = extractCoordinatesFromUrlString(match[1]);
            if (coords) return coords;
        }
    }

    // 2. Canonical link
    const canonicalRegex = /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i;
    const canonicalMatch = html.match(canonicalRegex);
    if (canonicalMatch && canonicalMatch[1]) {
        const coords = extractCoordinatesFromUrlString(canonicalMatch[1]);
        if (coords) return coords;
    }

    // 3. Coordinate snippets in inline scripts or window.__initState
    return extractCoordinatesFromUrlString(html);
}

/**
 * Parses any Google Maps URL (standard links, query coordinates, or short links)
 * to numerical latitude and longitude.
 *
 * @param mapLink The Google Maps URL or short link
 * @returns {Promise<ICoordinates | null>} Numerical latitude and longitude, or null if unparseable
 */
export async function parseMapLinkToCoordinates(
    mapLink: string
): Promise<ICoordinates | null> {
    if (!mapLink || typeof mapLink !== "string") {
        return null;
    }

    const trimmed = mapLink.trim();
    if (!trimmed) {
        return null;
    }

    // Ensure URL has a valid protocol
    let normalizedUrl = trimmed;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
    }

    // 1. Check if the URL string itself already contains extractable coordinates
    const directCoords = extractCoordinatesFromUrlString(normalizedUrl);
    if (directCoords) {
        return directCoords;
    }

    // 2. For shortened URLs (e.g. goo.gl/maps, maps.app.goo.gl) or links without inline coordinates,
    // perform an HTTP request following redirects to obtain the expanded URL.
    try {
        const response = await axios.get(normalizedUrl, {
            maxRedirects: 10,
            timeout: 5000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            validateStatus: () => true, // Accept 2xx, 3xx, 4xx to inspect response and headers
        });

        // Check final resolved URL
        const finalUrl: string | undefined =
            response.request?.res?.responseUrl ||
            response.headers?.location ||
            response.config?.url;

        if (finalUrl) {
            const finalCoords = extractCoordinatesFromUrlString(finalUrl);
            if (finalCoords) {
                return finalCoords;
            }
        }

        // Check redirect location header if present
        if (response.headers?.location) {
            const locationCoords = extractCoordinatesFromUrlString(
                response.headers.location
            );
            if (locationCoords) {
                return locationCoords;
            }
        }

        // Check response body for embedded canonical links, meta tags, or data
        if (typeof response.data === "string") {
            const htmlCoords = extractCoordinatesFromHtml(response.data);
            if (htmlCoords) {
                return htmlCoords;
            }
        }
    } catch {
        // Silently handle network errors/timeouts and return null
    }

    return null;
}

export class ManualDeliveryMapLinkService {
    async parseMapLinkToCoordinates(
        mapLink: string
    ): Promise<ICoordinates | null> {
        return parseMapLinkToCoordinates(mapLink);
    }
}
