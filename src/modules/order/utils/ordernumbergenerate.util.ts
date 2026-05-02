import { OrderModel } from "../models/order.model.js";

export async function generateOrderNumber() {
    const today = new Date();

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    const datePart = `${yyyy}${mm}${dd}`;

    const count = await OrderModel.countDocuments({
        createdAt: {
            $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
            $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`)
        }
    });

    const sequence = String(count + 1).padStart(4, "0");

    return `ORD-${datePart}-${sequence}`;
}