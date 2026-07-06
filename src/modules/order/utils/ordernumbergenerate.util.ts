import { OrderModel } from "../models/order.model.js";

// export async function generateOrderNumber() {
//     const today = new Date();

//     const yyyy = today.getFullYear();
//     const mm = String(today.getMonth() + 1).padStart(2, "0");
//     const dd = String(today.getDate()).padStart(2, "0");

//     const datePart = `${yyyy}${mm}${dd}`;

//     const count = await OrderModel.countDocuments({
//         createdAt: {
//             $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
//             $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`)
//         }
//     });

//     const sequence = String(count + 1).padStart(4, "0");

//     return `ORD-${datePart}-${sequence}`;
// }


const padOrderSequence = (num: number) => {
    return String(num).padStart(4, "0");
};

const getTodayOrderPrefix = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `ORD-${year}${month}${day}`;
};

export const generateOrderNumber = async () => {
    const prefix = getTodayOrderPrefix();

    const latestOrder = await OrderModel.findOne({
        orderNumber: {
            $regex: `^${prefix}-`,
        },
    })
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();

    let nextSequence = 1;

    if (latestOrder?.orderNumber) {
        const parts = latestOrder.orderNumber.split("-");
        const lastSequence = Number(parts[2] || 0);

        if (!Number.isNaN(lastSequence)) {
            nextSequence = lastSequence + 1;
        }
    }

    return `${prefix}-${padOrderSequence(nextSequence)}`;
};