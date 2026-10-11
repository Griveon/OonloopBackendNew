import type { NextFunction, Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";

interface ClickState {
    windowStartedAt: number;
    requestCount: number;
    categoryClicks: Map<string, number>;
    lastSeenAt: number;
}

interface ClickGuardOptions {
    dedupeWindowMs?: number;
    rateWindowMs?: number;
    maxRequestsPerWindow?: number;
    now?: () => number;
}

export const createCategoryClickGuard = (options: ClickGuardOptions = {}) => {
    const dedupeWindowMs = options.dedupeWindowMs ?? 30_000;
    const rateWindowMs = options.rateWindowMs ?? 60_000;
    const maxRequests = options.maxRequestsPerWindow ?? 60;
    const now = options.now ?? Date.now;
    const clients = new Map<string, ClickState>();
    let lastCleanupAt = now();

    return (req: Request, res: Response, next: NextFunction) => {
        const currentTime = now();
        const categoryId = Array.isArray(req.params.categoryId)
            ? req.params.categoryId[0]
            : req.params.categoryId;
        const userAgent = req.get("user-agent") || "unknown";
        const identity = req.user?.id
            ? `user:${req.user.id}`
            : `guest:${req.ip || req.socket.remoteAddress || "unknown"}:${userAgent}`;

        if (currentTime - lastCleanupAt >= rateWindowMs) {
            for (const [key, state] of clients) {
                if (currentTime - state.lastSeenAt >= rateWindowMs * 2) clients.delete(key);
            }
            lastCleanupAt = currentTime;
        }

        let state = clients.get(identity);
        if (!state || currentTime - state.windowStartedAt >= rateWindowMs) {
            state = {
                windowStartedAt: currentTime,
                requestCount: 0,
                categoryClicks: new Map(),
                lastSeenAt: currentTime,
            };
            clients.set(identity, state);
        }

        state.requestCount++;
        state.lastSeenAt = currentTime;
        if (state.requestCount > maxRequests) {
            res.setHeader("Retry-After", Math.ceil(rateWindowMs / 1000));
            return res.status(429).json(ResponseUtil.badRequest("Too many category click requests"));
        }

        const previousClick = categoryId ? state.categoryClicks.get(categoryId) : undefined;
        if (previousClick !== undefined && currentTime - previousClick < dedupeWindowMs) {
            res.setHeader("Retry-After", Math.ceil((dedupeWindowMs - (currentTime - previousClick)) / 1000));
            return res.status(429).json(ResponseUtil.badRequest("Category click already recorded recently"));
        }

        if (categoryId) state.categoryClicks.set(categoryId, currentTime);
        return next();
    };
};

export const categoryClickGuard = createCategoryClickGuard();
