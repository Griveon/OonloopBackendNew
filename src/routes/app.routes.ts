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
import vendorCouponRoutes from "../modules/vendorcoupon/routes/vendorcoupon.routes.js";
import unitRoutes from "../modules/unit/routes/unit.routes.js";
import productRoutes from "../modules/product/routes/product.routes.js";
import vendorDashboardCountsRoutes from "../modules/vendordashboardcounts/routes/vendordashboardcounts.routes.js";
import userProfileRoutes from "../modules/userprofile/routes/userprofile.routes.js";
import cartRoutes from "../modules/cart/routes/cart.routes.js";
import wishlistRoutes from "../modules/wishlist/routes/wishlist.routes.js";
import vendorRoutes from "../modules/vendor/routes/vendor.routes.js";
import orderRoutes from "../modules/order/routes/order.routes.js";
import productContainerRoutes from "../modules/productcontainer/routes/productcontainer.routes.js";
import productViewRoutes from "../modules/productview/routes/productview.routes.js";
import productReviewRoutes from "../modules/productreviews/routes/productreview.routes.js";
import driverProfileRoutes from "../modules/driverprofile/routes/driverprofile.routes.js";
import firebaseTokenRoutes from "../modules/notification/routes/firebasetoken.routes.js";
import vendorAccountStatementRoutes from "../modules/vendoraccountstatements/routes/vendoraccountsroutes.js";
import notificationRoutes from "../modules/notification/routes/notification.routes.js";
import userReportRoutes from "../modules/usersreport/routes/userreport.routes.js";

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

router.use("/vendorcoupon", vendorCouponRoutes);

router.use("/unit", unitRoutes);

router.use("/product", productRoutes);

router.use("/vendordashboard", vendorDashboardCountsRoutes);

router.use("/userprofile", userProfileRoutes);

router.use("/cart", cartRoutes);

router.use("/wishlist", wishlistRoutes);

router.use("/vendors", vendorRoutes);

router.use("/customerorder", orderRoutes);

router.use("/vendororder", orderRoutes);

router.use("/productcontainer", productContainerRoutes);

router.use("/productview", productViewRoutes);

router.use("/productreview", productReviewRoutes);

router.use("/driverprofile", driverProfileRoutes);

router.use("/driverorders", orderRoutes);

router.use("/firebasetokens", firebaseTokenRoutes);

router.use("/notifications", notificationRoutes);

router.use("/vendoraccountstatements", vendorAccountStatementRoutes);

router.use("/userreports", userReportRoutes);



export default router;