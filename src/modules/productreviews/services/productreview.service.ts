import { ProductReviewRepository } from "../repositories/productreview.repository.js";
import { ProductModel } from "../../product/models/product.model.js";
import { OrderModel } from "../../order/models/order.model.js";

export class ProductReviewService {

    private repo: ProductReviewRepository;

    constructor() {
        this.repo = new ProductReviewRepository();
    }

    async create(data: any) {

        const product = await ProductModel.findById(data.product);

        if (!product) {
            throw new Error("Product not found");
        }

        const order = await OrderModel.findOne({
            user: data.user,
            status: "delivered",
            "items.product": data.product,
        });

        if (!order) {
            throw new Error(
                "Review can only be added after purchasing and receiving the product"
            );
        }

        // 3. Check already reviewed
        const existingReview =
            await this.repo.findByUserAndProduct(
                data.user,
                data.product
            );

        if (existingReview) {
            throw new Error(
                "You have already reviewed this product"
            );
        }

        return this.repo.create({
            ...data,
            order: order._id,
            isVerifiedPurchase: true,
        });
    }

    async getById(id: string) {
        return this.repo.findById(id);
    }

    async update(id: string, data: any) {
        return this.repo.update(id, data);
    }

    async delete(id: string) {
        return this.repo.delete(id);
    }

    async getProductReviews(
        productId: any,
        page = 1,
        limit = 10
    ) {
        return this.repo.getProductReviews(
            productId,
            page,
            limit
        );
    }

    async getSummary(productId: any) {
        return this.repo.getReviewSummary(productId);
    }
}