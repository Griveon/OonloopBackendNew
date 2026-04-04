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
import providerConnectionRoutes from "../modules/providerconnection/routes/providerconnection.routes.js";
import paymentMethodRoutes from "../modules/paymentmethod/routes/paymentmethod.routes.js";
import paymentTransactionsRoutes from "../modules/paymenttransaction/routes/paymenttransaction.routes.js";
import vendorSubscriptionRoutes from "../modules/vendorsubscription/routes/vendorsubscription.routes.js";
import platformCommissionRoutes from "../modules/platformcommisison/routes/platformcommission.routes.js";
import vendorCategoryRoutes from "../modules/vendorcategory/routes/vendorcategory.routes.js";
import productCategoryRoutes from "../modules/productcategories/routes/productcategory.routes.js";
import brandRoutes from "../modules/brand/routes/brand.routes.js";
import productVariantRoutes from "../modules/productvariants/routes/productvariant.routes.js";
import ribbonRoutes from "../modules/ribbons/routes/ribbon.routes.js";
import gstruleRoutes from "../modules/gstrule/routes/gstrule.routes.js";

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

router.use("/providerconnection", providerConnectionRoutes);

router.use("/paymentmethod", paymentMethodRoutes);

router.use("/paymenttransaction", paymentTransactionsRoutes);

router.use("/vendorsubscription", vendorSubscriptionRoutes);

router.use("/platformcommission", platformCommissionRoutes);

router.use("/vendorcategory", vendorCategoryRoutes);

router.use("/productcategory", productCategoryRoutes);

router.use("/brand", brandRoutes);

router.use("/productvariant", productVariantRoutes);

router.use("/ribbon", ribbonRoutes);

router.use("/gstrule", gstruleRoutes);



export default router;