import { ResponseUtil } from "../../../utils/response.util.js";
import { ProductContainerProductsService } from "../services/productcontainerproducts.service.js";
import type {
    Request,
    Response,
} from "express";

export class ProductContainerProductsController {

    private service =
        new ProductContainerProductsService();

    getProducts = async (
        req: Request,
        res: Response
    ) => {
        try {
            const containerId =
                req.params.containerId;

            const page =
                Number(req.query.page) || 1;

            const limit =
                Number(req.query.limit) || 20;

            const search =
                (req.query.search as string) || "";

            const result =
                await this.service.getProducts(
                    containerId,
                    page,
                    limit,
                    search
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Products fetched successfully",
                    result
                )
            );

        } catch (error: any) {

            return res.status(400).json(
                ResponseUtil.badRequest(
                    error.message
                )
            );
        }
    };
}