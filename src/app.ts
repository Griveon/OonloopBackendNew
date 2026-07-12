import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";

import appRoutes from "./routes/app.routes.js";
// import { migrate } from "./productrunscript.js";

const app = express();

/**
 * Static mock assets (dev/demo) — served before helmet so cross-origin image
 * loads from the app aren't blocked. e.g. GET /mock-assets/qrcode.jpeg
 */
app.use(
    "/mock-assets",
    express.static(path.resolve(process.cwd(), "src/mock_assets"))
);

/**
 * Security
 */
app.use(helmet());
app.use(cors());

/**
 * Performance
 */
app.use(compression());

/**
 * Body parsing
 */
/**
 * Body parsing (🔥 increase limit)
 */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
/**
 * Routes
 */

app.use("/api/v1", appRoutes);

// migrate();

export default app;