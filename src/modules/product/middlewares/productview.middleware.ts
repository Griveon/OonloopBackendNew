import type { NextFunction, Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";

interface ProductViewState {
    windowStartedAt: number;
    requestCount: number;
    productViews: Map<string, number>;
    lastSeenAt: number;
}

interface ProductViewGuardOptions {
    dedupeWindowMs?: number;
    rateWindowMs?: number;
    maxRequestsPerWindow?: number;
    now?: () => number;
}

export const createProductViewGuard = (options: ProductViewGuardOptions = {}) => {
    const dedupeWindowMs = options.dedupeWindowMs ?? 30_000;
    const rateWindowMs = options.rateWindowMs ?? 60_000;
    const maxRequests = options.maxRequestsPerWindow ?? 60;
    const now = options.now ?? Date.now;
    const clients = new Map<string, ProductViewState>();
    let lastCleanupAt = now();

    return (req: Request, res: Response, next: NextFunction) => {
        const currentTime = now();
        const productId = Array.isArray(req.params.productId)
            ? req.params.productId[0]
            : req.params.productId;
        const userAgent = req.get("user-agent") || "unknown";
        const identity = req.user?.id
            ? `user:${req.user.id}`
            : `guest:${req.ip || req.socket.remoteAddress || "unknown"}:${userAgent}`;

        // Periodically prune stale clients
        if (currentTime - lastCleanupAt >= rateWindowMs) {
            for (const [key, state] of clients) {
                if (currentTime - state.lastSeenAt >= rateWindowMs * 2) {
                    clients.delete(key);
                }
            }
            lastCleanupAt = currentTime;
        }

        let state = clients.get(identity);
        if (!state || currentTime - state.windowStartedAt >= rateWindowMs) {
            state = {
                windowStartedAt: currentTime,
                requestCount: 0,
                productViews: new Map(),
                lastSeenAt: currentTime,
            };
            clients.set(identity, state);
        }

        state.requestCount++;
        state.lastSeenAt = currentTime;

        if (state.requestCount > maxRequests) {
            res.setHeader("Retry-After", Math.ceil(rateWindowMs / 1000));
            return res
                .status(429)
                .json(ResponseUtil.badRequest("Too many product view requests"));
        }

        const previousView = productId ? state.productViews.get(productId) : undefined;
        if (previousView !== undefined && currentTime - previousView < dedupeWindowMs) {
            res.setHeader(
                "Retry-After",
                Math.ceil((dedupeWindowMs - (currentTime - previousView)) / 1000)
            );
            return res
                .status(429)
                .json(ResponseUtil.badRequest("Product view already recorded recently"));
        }

        if (productId) {
            state.productViews.set(productId, currentTime);
        }

        return next();
    };
};

export const productViewGuard = createProductViewGuard();
