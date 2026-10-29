import { Types } from "mongoose";
import { FirebaseTokenService } from "../../notification/services/firebasetoken.service.js";
import type { IManualDeliveryDocument } from "../interfaces/manualdelivery.interface.js";

export class ManualDeliveryNotificationService {
    private firebaseTokenService = new FirebaseTokenService();

    /**
     * Broadcasts a push notification to all active drivers when a new manual delivery
     * order is created or returned to the available pool.
     * Mirrors the vendor paid-order driver notification flow.
     */
    async notifyDriversNewAvailableDelivery(delivery: IManualDeliveryDocument): Promise<void> {
        try {
            if (!delivery || !delivery._id) {
                return;
            }

            const deliveryId = delivery._id.toString();
            const deliveryNumber = delivery.deliveryNumber || "";
            const storeName = delivery.pickup?.storeName?.trim() || "Store";
            const pickupCity = delivery.pickup?.city?.trim() || "";
            const dropoffCity = delivery.dropoff?.city?.trim() || "";
            const distanceKm = delivery.distance?.valueKm != null ? `${delivery.distance.valueKm} km` : "";

            const title = "New delivery order available";
            const body = deliveryNumber
                ? `New manual delivery ${deliveryNumber} from ${storeName} is ready. Open available orders to take it.`
                : `A new delivery order from ${storeName} is available to take.`;

            const pushData: Record<string, string> = {
                type: "DRIVER_NEW_MANUAL_DELIVERY",
                eventType: "NEW_MANUAL_DELIVERY_AVAILABLE",
                screen: "DRIVER_AVAILABLE_ORDERS",
                deliveryType: "manual_delivery",
                deliveryId,
                deliveryNumber,
                storeName,
                pickupCity,
                dropoffCity,
                distanceKm,
                sound: "order_alert",
                channelId: "new_paid_orders_v1",
                click_action: "FLUTTER_NOTIFICATION_CLICK",
            };

            const result = await this.firebaseTokenService.sendDataNotificationToRole({
                role: "driver",
                title,
                body,
                data: pushData,
            });

            console.log("Manual delivery driver broadcast push result:", {
                deliveryNumber,
                result: result?.success,
                totalTokens: result?.totalTokens,
            });
        } catch (error: any) {
            // Push notifications must never break order workflows
            console.error("Manual delivery driver broadcast push error:", {
                deliveryNumber: delivery?.deliveryNumber,
                message: error?.message || error,
            });
        }
    }

    /**
     * Sends a direct push notification to an assigned driver.
     */
    async notifyAssignedDriver(
        delivery: IManualDeliveryDocument,
        driverUserId: string | Types.ObjectId
    ): Promise<void> {
        try {
            if (!driverUserId || !delivery) {
                return;
            }

            const deliveryId = delivery._id.toString();
            const deliveryNumber = delivery.deliveryNumber || "";
            const storeName = delivery.pickup?.storeName?.trim() || "Vendor";

            const title = "New delivery assigned to you";
            const body = deliveryNumber
                ? `You have been assigned delivery ${deliveryNumber} from ${storeName}. Open app to view and accept.`
                : `You have been assigned a new delivery from ${storeName}.`;

            const result = await this.firebaseTokenService.sendNotificationToUser({
                userId: driverUserId.toString(),
                title,
                body,
                data: {
                    type: "MANUAL_DELIVERY_ASSIGNED",
                    eventType: "DELIVERY_ASSIGNED",
                    screen: "DRIVER_ORDER_DETAILS",
                    deliveryType: "manual_delivery",
                    deliveryId,
                    deliveryNumber,
                    storeName,
                    sound: "order_alert",
                    channelId: "new_paid_orders_v1",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                },
            });

            console.log("Manual delivery assigned driver push result:", {
                deliveryNumber,
                driverUserId: driverUserId.toString(),
                success: result?.success,
            });
        } catch (error: any) {
            console.error("Manual delivery assigned driver push error:", {
                deliveryNumber: delivery?.deliveryNumber,
                message: error?.message || error,
            });
        }
    }

    /**
     * Sends a push notification to the vendor when the driver updates the delivery status
     * (e.g. accepted, picked up, out for delivery, reached, delivered, or failed).
     */
    async notifyVendorStatusUpdate(
        delivery: IManualDeliveryDocument,
        status: string,
        remark?: string
    ): Promise<void> {
        try {
            const vendorUserId = delivery.vendor?.toString?.() || (delivery.vendor as any)?._id?.toString?.();
            if (!vendorUserId) {
                return;
            }

            const deliveryId = delivery._id.toString();
            const deliveryNumber = delivery.deliveryNumber || "";

            const title = "Manual delivery status updated";
            const body =
                remark ||
                `Delivery ${deliveryNumber} status has been updated to ${status}.`;

            const result = await this.firebaseTokenService.sendNotificationToUser({
                userId: vendorUserId,
                title,
                body,
                data: {
                    type: "MANUAL_DELIVERY_STATUS_UPDATED",
                    eventType: "STATUS_UPDATED",
                    screen: "VENDOR_ORDER_DETAILS",
                    deliveryType: "manual_delivery",
                    deliveryId,
                    deliveryNumber,
                    status,
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                },
            });

            console.log("Manual delivery vendor push notification result:", {
                deliveryNumber,
                status,
                vendorUserId,
                success: result?.success,
            });
        } catch (error: any) {
            console.error("Manual delivery vendor push error:", {
                deliveryNumber: delivery?.deliveryNumber,
                message: error?.message || error,
            });
        }
    }
}
