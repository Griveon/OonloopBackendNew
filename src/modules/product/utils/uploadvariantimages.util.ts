import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { uploadVariantImagesToR2 } from "./r2uploadvariant.util.js";

export const uploadVariantImages = async (req: Request, res: Response) => {
    try {
        const files:any = Array.isArray(req.files)
            ? req.files
            : (req.files?.variantImages as Express.Multer.File[] | undefined) || [];

        if (!files.length) {
            return res.status(400).json(ResponseUtil.badRequest("No files uploaded"));
        }

        const urls = await uploadVariantImagesToR2(files);
        return res.status(200).json(ResponseUtil.success("Variant images uploaded", urls));
    } catch (error: any) {
        return res.status(500).json(ResponseUtil.serverError(error.message));
    }
};