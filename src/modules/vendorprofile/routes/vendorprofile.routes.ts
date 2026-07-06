import { Router } from "express";
import { VendorProfileController } from "../controllers/vendorprofile.controller.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { upload } from "../../../config/multer.config.js";
import { VendorKycController } from "../controllers/vendorkyc.controller.js";

const vendorProfileRoutes = Router();

const controller = new VendorProfileController();
const vendorKYCController = new VendorKycController();

vendorProfileRoutes.post(
    "/create",
    controller.createVendor
);

vendorProfileRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getVendorById
);

vendorProfileRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAllVendors
);

vendorProfileRoutes.put(
    "/update/:id",
    authMiddleware,
    controller.updateVendor
);

vendorProfileRoutes.delete(
    "/delete/:id",
    authMiddleware,
    controller.deleteVendor
);

vendorProfileRoutes.put(
    "/holiday/:id",
    authMiddleware,
    controller.toggleHolidayStatus
);

vendorProfileRoutes.put(
    "/approve-kyc/:id",
    authMiddleware,
    controller.approveKyc
);

vendorProfileRoutes.put(
    "/reject-kyc/:id",
    authMiddleware,
    controller.rejectKyc
);

vendorProfileRoutes.get(
    "/check-profile-completed/:id",
    authMiddleware,
    controller.checkProfileCompleted
);

vendorProfileRoutes.get(
    "/checkkyc/:id",
    authMiddleware,
    controller.checkKYCStatus
);

vendorProfileRoutes.post(
    "/kycdocuments/upload",
    authMiddleware,
    upload.fields([
        { name: "gstCertificate", maxCount: 1 },
        { name: "panCard", maxCount: 1 },
        { name: "cancelledCheque", maxCount: 1 },
        { name: "storeRegistration", maxCount: 1 },
        { name: "aadhaarCard", maxCount: 1 },
        { name: "tradeLicense", maxCount: 1 },
        { name: "udyamAadhaar", maxCount: 1 },
        { name: "shopActLicense", maxCount: 1 },
        { name: "certificateOfIncorporation", maxCount: 1 },
        { name: "other", maxCount: 1 },
    ]),
    vendorKYCController.upload
);

vendorProfileRoutes.get(
    "/kycdocuments/get",
    authMiddleware,
    vendorKYCController.getKycDocuments
);

vendorProfileRoutes.get(
    "/kycdocuments/preview",
    authMiddleware,
    vendorKYCController.getKycDocumentsWithPreview
);

vendorProfileRoutes.get(
    "/kycdocuments/status",
    authMiddleware,
    vendorKYCController.checkKycStatus
);

vendorProfileRoutes.delete(
    "/delete/kycdocuments/:docKey",
    authMiddleware,
    vendorKYCController.deleteKycDocument
);

export default vendorProfileRoutes;