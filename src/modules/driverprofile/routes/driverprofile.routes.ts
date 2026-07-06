import { Router } from "express";
import { DriverProfileController } from "../controllers/driverprofile.controller.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { DriverKycController } from "../controllers/driverkyc.controller.js";
import { upload } from "../../../config/multer.config.js";

const driverProfileRoutes = Router();

const controller = new DriverProfileController();
const driverKYCController = new DriverKycController();


driverProfileRoutes.post(
    "/create",
    controller.createDriver
);

driverProfileRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getDriverById
);

driverProfileRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAllDrivers
);

driverProfileRoutes.put(
    "/update/:id",
    authMiddleware,
    controller.updateDriver
);

driverProfileRoutes.delete(
    "/delete/:id",
    authMiddleware,
    controller.deleteDriver
);

driverProfileRoutes.post(
    "/kycdocuments/upload",
    authMiddleware,
    upload.fields([
        { name: "aadhaarCard", maxCount: 1 },
        { name: "panCard", maxCount: 1 },
        { name: "drivingLicense", maxCount: 1 },
        { name: "rcBook", maxCount: 1 },
        { name: "insurance", maxCount: 1 },
        { name: "vehiclePermit", maxCount: 1 },
        { name: "pollutionCertificate", maxCount: 1 },
        { name: "profilePhoto", maxCount: 1 },
    ]),
    driverKYCController.upload
);

driverProfileRoutes.get(
    "/kycdocuments/preview",
    authMiddleware,
    driverKYCController.getKycDocumentsWithPreview
);

driverProfileRoutes.get(
    "/kycdocuments/get",
    authMiddleware,
    driverKYCController.getKycDocuments
);

driverProfileRoutes.delete(
    "/delete/kycdocuments/:docKey",
    authMiddleware,
    driverKYCController.deleteKycDocument
);

driverProfileRoutes.get(
    "/status",
    authMiddleware,
    driverKYCController.checkKycStatus
);


export default driverProfileRoutes;