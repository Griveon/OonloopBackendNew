import type { Request, Response, NextFunction } from "express";

export interface IPerformanceMetrics {
    method: string;
    url: string;
    statusCode: number;
    durationMs: number;
    contentLengthBytes?: number;
    timestamp: string;
    level: "normal" | "investigate" | "slow" | "critical";
}

const isEnabled = process.env.PERF_MONITOR_ENABLED !== "false";
const INVESTIGATE_THRESHOLD_MS = Number(process.env.PERF_INVESTIGATE_MS || 300);
const SLOW_THRESHOLD_MS = Number(process.env.PERF_SLOW_MS || 500);
const CRITICAL_THRESHOLD_MS = Number(process.env.PERF_CRITICAL_MS || 1000);

export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
    if (!isEnabled) {
        return next();
    }

    const start = process.hrtime.bigint();

    // Hook response finish
    res.on("finish", () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;

        const contentLengthHeader = res.getHeader("content-length");
        const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;

        let level: IPerformanceMetrics["level"] = "normal";
        if (durationMs >= CRITICAL_THRESHOLD_MS) {
            level = "critical";
        } else if (durationMs >= SLOW_THRESHOLD_MS) {
            level = "slow";
        } else if (durationMs >= INVESTIGATE_THRESHOLD_MS) {
            level = "investigate";
        }

        // Add response header for client inspection
        try {
            if (!res.headersSent) {
                res.setHeader("X-Response-Time", `${durationMs.toFixed(2)}ms`);
            }
        } catch {
            // Headers may have already been written
        }

        // Only emit structured warning logs if threshold exceeded or debug mode
        if (level !== "normal" || process.env.PERF_LOG_ALL === "true") {
            const metrics: IPerformanceMetrics = {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                durationMs: Math.round(durationMs * 100) / 100,
                ...(contentLength !== undefined ? { contentLengthBytes: contentLength } : {}),
                timestamp: new Date().toISOString(),
                level,
            };

            if (level === "critical") {
                console.warn("🚨 [PERF CRITICAL API WARNING]:", JSON.stringify(metrics));
            } else if (level === "slow") {
                console.warn("⚠️ [PERF SLOW API WARNING]:", JSON.stringify(metrics));
            } else if (level === "investigate") {
                console.info("🔍 [PERF INVESTIGATE]:", JSON.stringify(metrics));
            } else if (process.env.PERF_LOG_ALL === "true") {
                console.log("⏱️ [PERF METRIC]:", JSON.stringify(metrics));
            }
        }
    });

    next();
}
