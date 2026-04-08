import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { uploadProductImagesToR2 } from "./r2uploadproduct.util.js";

export const uploadProductImages = async (req: Request, res: Response) => {
    try {
        // Ensure req.files is an object with fields
        const files:any = Array.isArray(req.files)
            ? req.files
            : (req.files?.productImages as Express.Multer.File[] | undefined) || [];

        if (!files.length) {
            return res.status(400).json(ResponseUtil.badRequest("No files uploaded"));
        }

        const urls = await uploadProductImagesToR2(files);
        return res.status(200).json(ResponseUtil.success("Images uploaded", urls));
    } catch (error: any) {
        return res.status(500).json(ResponseUtil.serverError(error.message));
    }
};