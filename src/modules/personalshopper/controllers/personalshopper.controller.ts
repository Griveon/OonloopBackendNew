import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { PersonalShopperService } from "../services/personalshopper.service.js";
import { uploadToR2 } from "../../vendorprofile/utils/vendorprofile.util.js";

export class PersonalShopperController {
    private service = new PersonalShopperService();

    // POST /personalshopper/upload-image  (auth)
    // Returns a URL the form drops into stores[].image
    uploadImage = async (req: Request, res: Response) => {
        try {
            const file = (req as any).file as Express.Multer.File | undefined;
            if (!file) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Image file is required"));
            }
            const url = await uploadToR2(file, "personalshopper/stores");
            return res
                .status(201)
                .json(ResponseUtil.created("Image uploaded successfully", { url }));
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    // GET /personalshopper/pricing  (public)
    getPricing = (_req: Request, res: Response) => {
        return res
            .status(200)
            .json(ResponseUtil.success("Pricing policy fetched", this.service.getPricingPolicy()));
    };

    // POST /personalshopper/estimate  (public)
    estimate = async (req: Request, res: Response) => {
        try {
            const result = this.service.estimate(req.body);
            return res
                .status(200)
                .json(ResponseUtil.success("Estimate calculated", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // POST /personalshopper/create  (auth)
    create = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const booking = await this.service.create(userId, req.body);
            return res
                .status(201)
                .json(ResponseUtil.created("Personal shopper booked successfully", booking));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // GET /personalshopper/my  (auth)
    getMyBookings = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const status = (req.query.status as string) || undefined;

            const result = await this.service.getMyBookings(userId, page, limit, status);

            return res.status(200).json(
                ResponseUtil.paginated(
                    "Bookings fetched successfully",
                    result.items,
                    result.page,
                    result.limit,
                    result.total
                )
            );
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    // GET /personalshopper/rider/bookings  (auth, rider) — jobs assigned to me
    getRiderBookings = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const scope = (req.query.scope as "active" | "all") || "active";
            const result = await this.service.getRiderBookings(userId, scope);
            return res
                .status(200)
                .json(ResponseUtil.success("Assigned bookings", result));
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    // GET /personalshopper/rider/requests  (auth, rider) — open requests to accept
    getOpenRequests = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const result = await this.service.getOpenRequests(userId);
            return res
                .status(200)
                .json(ResponseUtil.success("Open shopper requests", result));
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    // POST /personalshopper/:id/accept  (auth, rider) — accept a request (first-wins)
    acceptBooking = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const result = await this.service.acceptBooking(req.params.id as string, userId);
            return res
                .status(200)
                .json(ResponseUtil.success("Request accepted", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // GET /personalshopper/get/:id  (auth)
    getById = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const id = req.params.id as string;
            const booking = await this.service.getById(id, userId);
            return res
                .status(200)
                .json(ResponseUtil.success("Booking fetched successfully", booking));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    // GET /personalshopper/:id/track  (auth) — poll for delivery progress
    track = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const result = await this.service.track(req.params.id as string, userId);
            return res
                .status(200)
                .json(ResponseUtil.success("Tracking status", result));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    // GET /personalshopper/:id/rider-location  (auth) — rider's live coordinates
    riderLocation = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const result = await this.service.riderLocation(req.params.id as string, userId);
            return res
                .status(200)
                .json(ResponseUtil.success("Rider location", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // POST /personalshopper/:id/rider-location  (auth, rider) — push real coordinates
    pushRiderLocation = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const { lat, lng } = req.body;
            const result = await this.service.pushRiderLocation(
                req.params.id as string,
                userId,
                Number(lat),
                Number(lng)
            );
            return res
                .status(200)
                .json(ResponseUtil.success("Rider location updated", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // POST /personalshopper/:id/photos  (auth, rider) — send a shopping photo
    addPhoto = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const photo = await this.service.addPhoto(req.params.id as string, userId, req.body);
            return res
                .status(201)
                .json(ResponseUtil.created("Photo added", photo));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // GET /personalshopper/:id/photos  (auth) — customer/rider view the feed
    getPhotos = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const result = await this.service.getPhotos(req.params.id as string, userId);
            return res
                .status(200)
                .json(ResponseUtil.success("Photos fetched", result));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    // PUT /personalshopper/photos/:photoId/respond  (auth, customer) — approve/reject
    respondPhoto = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const { action, remark } = req.body;
            const photo = await this.service.respondPhoto(
                req.params.photoId as string,
                userId,
                action,
                remark
            );
            return res
                .status(200)
                .json(ResponseUtil.success("Photo updated", photo));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // PUT /personalshopper/cancel/:id  (auth)
    cancel = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const id = req.params.id as string;
            const booking = await this.service.cancel(id, userId);
            return res
                .status(200)
                .json(ResponseUtil.success("Booking cancelled", booking));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };
}
