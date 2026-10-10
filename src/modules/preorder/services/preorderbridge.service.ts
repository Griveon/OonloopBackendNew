import { OrderModel } from "../../order/models/order.model.js";
import { OrderVendorModel } from "../../vendororder/models/vendororder.model.js";
import { PreorderOrderModel } from "../models/preorderorder.model.js";
import { PaymentTransactionModel } from "../../paymenttransaction/models/paymenttransaction.model.js";
import { FirebaseTokenService } from "../../notification/services/firebasetoken.service.js";

/**
 * Bridge: when a seller marks a preorder "ready", materialize it into the
 * normal Order + OrderVendor so it flows through the existing driver delivery
 * pipeline (available-orders → take-order → pickup → delivery) unchanged.
 *
 * The preorder stays the customer-facing record; delivery progress is mirrored
 * back onto it (see syncPreorderFromVendorOrder).
 */

function buildShippingAddress(d: any) {
    const addr: any = {
        name: d?.fullName || "",
        phone: d?.mobileNumber || "",
        addressLine1: d?.addressLine1 || "",
        addressLine2: d?.addressLine2 || "",
        city: d?.city || "",
        state: d?.state || "",
        pincode: d?.pincode || "",
        postalCode: d?.pincode || "",
        country: d?.country || "India",
    };
    if (d?.location && typeof d.location.lat === "number" && typeof d.location.lng === "number") {
        addr.lat = d.location.lat;
        addr.lng = d.location.lng;
        addr.latitude = d.location.lat;
        addr.longitude = d.location.lng;
        addr.location = {
            type: "Point",
            coordinates: [d.location.lng, d.location.lat],
        };
    }
    return addr;
}

function mapItems(preorder: any) {
    return (preorder.items || []).map((it: any) => {
        const item: any = {
            vendorType: "system",
            vendor: preorder.vendor,
            product: it.product,
            name: it.name,
            price: it.price,
            mrp: it.price,
            quantity: it.qty,
            total: it.total,
            images: it.image ? [{ url: it.image }] : [],
        };
        if (it.variantId) item.variant = it.variantId;
        return item;
    });
}

/**
 * Create the Order + OrderVendor from a paid, ready preorder.
 * Idempotent: if the preorder already has a linkedVendorOrder, returns it.
 */
export async function bridgePreorderToDelivery(preorder: any) {
    // already bridged?
    if (preorder.linkedVendorOrder) {
        return OrderVendorModel.findById(preorder.linkedVendorOrder);
    }

    // Recover the paymentMethod (required on Order/OrderVendor) from the
    // preorder's payment transaction.
    let paymentMethod = preorder.paymentMethod;
    if (!paymentMethod && preorder.paymentTransaction) {
        const txn = await PaymentTransactionModel.findById(preorder.paymentTransaction).select("paymentMethod");
        paymentMethod = txn?.paymentMethod;
    }
    if (!paymentMethod) {
        throw new Error("Cannot bridge preorder: payment method not found");
    }

    const shippingAddress = buildShippingAddress(preorder.delivery);
    const items = mapItems(preorder);

    // 1) Parent Order (tagged isPreorder so it stays out of normal lists)
    const order = await OrderModel.create({
        user: preorder.user,
        orderNumber: preorder.orderNumber,
        items,
        shippingAddress,
        paymentMethod,
        paymentTransaction: preorder.paymentTransaction,
        subtotal: preorder.subtotal,
        totalAmount: preorder.totalAmount,
        paymentStatus: "success",
        paymentMode: "online",
        status: "ready_for_pickup",
        isPreorder: true,
        preorder: preorder._id,
        trackingHistory: [
            {
                title: "Preorder ready for pickup",
                status: "ready_for_pickup",
                remark: "Preorder prepared by seller; handed to delivery.",
                updatedByRole: "system",
                updatedAt: new Date(),
            },
        ],
    });

    // 2) OrderVendor (the operational record the driver flow reads)
    const vendorOrder = await OrderVendorModel.create({
        parentOrder: order._id,
        user: preorder.user,
        vendorType: "system",
        vendor: preorder.vendor,
        orderNumber: order.orderNumber,
        vendorOrderNumber: `${order.orderNumber}-V1`,
        items,
        shippingAddress,
        paymentMethod,
        paymentTransaction: preorder.paymentTransaction,
        subtotal: preorder.subtotal,
        totalAmount: preorder.totalAmount,
        paymentStatus: "success",
        paymentMode: "online",
        status: "ready_for_pickup",
        sellerStatus: "ready_for_pickup",
        deliveryStatus: "not_assigned",
        readyForPickupAt: new Date(),
        isPreorder: true,
        preorder: preorder._id,
        trackingHistory: [
            {
                title: "Ready for pickup",
                status: "ready_for_pickup",
                remark: "Preorder prepared; available for a rider.",
                updatedByRole: "system",
                updatedAt: new Date(),
            },
        ],
    });

    // 3) Link back onto the preorder
    await PreorderOrderModel.findByIdAndUpdate(preorder._id, {
        $set: {
            linkedOrder: order._id,
            linkedVendorOrder: vendorOrder._id,
            paymentMethod,
        },
    });

    // 4) Notify drivers — same push the normal flow uses, fired now because the
    //    order is only available to riders once it's ready (bridged).
    void notifyDriversPreorderReady(order.orderNumber, order._id.toString());

    return vendorOrder;
}

async function notifyDriversPreorderReady(orderNumber: string, parentOrderId: string) {
    try {
        await new FirebaseTokenService().sendDataNotificationToRole({
            role: "driver",
            title: "New delivery order available",
            body: orderNumber
                ? `Paid order ${orderNumber} is ready for a driver. Open available orders to take it.`
                : "A new paid delivery order is available. Open available orders to take it.",
            data: {
                type: "DRIVER_NEW_PAID_ORDER",
                screen: "DRIVER_AVAILABLE_ORDERS",
                parentOrderId,
                orderNumber: orderNumber || "",
                sound: "order_alert",
                channelId: "new_paid_orders_v1",
            },
        });
    } catch (error: any) {
        console.log("Preorder driver push error:", error?.message || error);
    }
}

/**
 * Coarse delivery tracking block for the customer's preorder screen, read from
 * the linked OrderVendor. Lets the customer stay on the preorder endpoint
 * instead of switching to the normal order-tracking API.
 */
export async function getPreorderDeliveryTracking(vendorOrderId: any) {
    if (!vendorOrderId) return null;
    const vo: any = await OrderVendorModel.findById(vendorOrderId)
        .select("+customerVerification.deliveryOtp")
        .populate("driver", "firstName lastName mobileNumber");
    if (!vo) return null;

    const driver = vo.driver
        ? {
              name: `${(vo.driver as any).firstName || ""} ${(vo.driver as any).lastName || ""}`.trim(),
              mobileNumber: (vo.driver as any).mobileNumber,
          }
        : null;

    return {
        vendorOrderNumber: vo.vendorOrderNumber,
        deliveryStatus: vo.deliveryStatus,
        deliveryOtp: vo.customerVerification?.deliveryOtp || null,
        driver,
        readyForPickupAt: vo.readyForPickupAt || null,
        outForDeliveryAt: vo.outForDeliveryAt || null,
        deliveredAt: vo.deliveredAt || null,
    };
}

/**
 * Mirror a bridged OrderVendor's delivery progress back onto the preorder so
 * the customer sees it on the preorder screen (coarse status).
 * Only `out_for_delivery` and `delivered` matter for the coarse view.
 */
export async function syncPreorderFromVendorOrder(vendorOrder: any) {
    if (!vendorOrder?.isPreorder || !vendorOrder?.preorder) return;

    const deliveryStatus = vendorOrder.deliveryStatus;
    const set: Record<string, any> = {};
    let title = "";

    if (deliveryStatus === "out_for_delivery") {
        set.status = "out_for_delivery";
        title = "Out for delivery";
    } else if (deliveryStatus === "delivered") {
        set.status = "delivered";
        set.deliveredAt = vendorOrder.deliveredAt || new Date();
        title = "Delivered";
    } else {
        return; // nothing coarse to mirror
    }

    await PreorderOrderModel.findByIdAndUpdate(vendorOrder.preorder, {
        $set: set,
        $push: {
            trackingHistory: {
                title,
                status: set.status,
                remark: "Updated from delivery flow",
                updatedByRole: "driver",
                updatedAt: new Date(),
            },
        },
    });
}
