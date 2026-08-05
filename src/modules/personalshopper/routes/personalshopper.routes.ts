import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { upload } from "../../../config/multer.config.js";
import { PersonalShopperController } from "../controllers/personalshopper.controller.js";
import {
    estimateSchema,
    createBookingSchema,
} from "../validations/personalshopper.validation.js";

const personalShopperRoutes = Router();
const controller = new PersonalShopperController();

// Public info + estimate (used before login on the pricing/preview screens)
personalShopperRoutes.get("/pricing", controller.getPricing);

// Store reference image upload -> returns { url } for stores[].image
personalShopperRoutes.post(
    "/upload-image",
    authMiddleware,
    upload.single("image"),
    controller.uploadImage
);
personalShopperRoutes.post(
    "/estimate",
    validateUsingZOD(estimateSchema),
    controller.estimate
);

// Authenticated booking actions
personalShopperRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createBookingSchema),
    controller.create
);

personalShopperRoutes.get("/my", authMiddleware, controller.getMyBookings);

// Rider polls this to discover jobs assigned to them
personalShopperRoutes.get("/rider/bookings", authMiddleware, controller.getRiderBookings);

// Offer/accept assignment (shopper flow only)
personalShopperRoutes.get("/rider/requests", authMiddleware, controller.getOpenRequests);
personalShopperRoutes.post("/:id/accept", authMiddleware, controller.acceptBooking);

personalShopperRoutes.get("/get/:id", authMiddleware, controller.getById);

// Delivery tracking (poll)
personalShopperRoutes.get("/:id/track", authMiddleware, controller.track);
personalShopperRoutes.get("/:id/rider-location", authMiddleware, controller.riderLocation);
personalShopperRoutes.post("/:id/rider-location", authMiddleware, controller.pushRiderLocation);

// Shopper photos (rider sends, customer approves)
personalShopperRoutes.post("/:id/photos", authMiddleware, controller.addPhoto);
personalShopperRoutes.get("/:id/photos", authMiddleware, controller.getPhotos);
personalShopperRoutes.put("/photos/:photoId/respond", authMiddleware, controller.respondPhoto);

personalShopperRoutes.put("/cancel/:id", authMiddleware, controller.cancel);

export default personalShopperRoutes;
