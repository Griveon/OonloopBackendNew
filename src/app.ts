import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import appRoutes from "./routes/app.routes.js";
// import { migrate } from "./productrunscript.js";

const app = express();

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