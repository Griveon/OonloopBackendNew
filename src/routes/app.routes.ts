import { Router } from "express";
import userAuthRoutes from "../modules/user/routes/userauth.routes.js";
import featureRoutes from "../modules/feature/routes/feature.routes.js";
import planRoutes from "../modules/plan/routes/plan.routes.js";
import currencyRoutes from "../modules/currency/routes/currency.routes.js";
import planFeatureRoutes from "../modules/planfeature/routes/planfeature.routes.js";
import workspacePermissionRoutes from "../modules/workspacepermission/routes/workspacepermission.routes.js";
import workspaceRoutes from "../modules/workspace/routes/workspace.routes.js";
import workspaceSubscriptionRoutes from "../modules/workspacesubscription/routes/workspacesubscription.routes.js";
import vendorProfileRoutes from "../modules/vendorprofile/routes/vendorprofile.routes.js";

userAuthRoutes

const router = Router();

/**
 * Module Routes
 */
router.use("/auth", userAuthRoutes);

router.use("/vendor-profile", vendorProfileRoutes);

router.use("/features", featureRoutes);

router.use("/plans", planRoutes);

router.use("/currency", currencyRoutes);

router.use("/planfeatures", planFeatureRoutes);

router.use("/workspacepermissions", workspacePermissionRoutes);

router.use("/workspaceroles", workspacePermissionRoutes);

router.use("/workspaces", workspaceRoutes);

router.use("/workspacessubscription", workspaceSubscriptionRoutes);


export default router;