import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import appRoutes from "./routes/app.routes.js";

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Routes
 */
app.use("/api/v1", appRoutes);

export default app;