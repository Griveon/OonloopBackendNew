import assert from "node:assert/strict";
import test from "node:test";
import { resolvePushSoundAndChannel } from "../modules/notification/utils/firebasepush.util.js";

test("Notification Sound - Vendor new paid order uses order_alert sound and channel", () => {
    const data = {
        type: "NEW_VENDOR_ORDER",
        orderId: "parent_123",
        vendorOrderId: "v_123",
    };

    const result = resolvePushSoundAndChannel(data);

    assert.equal(result.isOrderAlert, true);
    assert.equal(result.sound, "order_alert");
    assert.equal(result.channelId, "new_paid_orders_v1");
    assert.equal(result.apnsSound, "order_alert.wav");
});

test("Notification Sound - Vendor manual delivery status update uses order_alert sound and channel", () => {
    const data = {
        type: "MANUAL_DELIVERY_STATUS_UPDATED",
        deliveryId: "del_123",
        status: "picked_up",
    };

    const result = resolvePushSoundAndChannel(data);

    assert.equal(result.isOrderAlert, true);
    assert.equal(result.sound, "order_alert");
    assert.equal(result.channelId, "new_paid_orders_v1");
    assert.equal(result.apnsSound, "order_alert.wav");
});

test("Notification Sound - Driver paid order matches vendor order sound and channel", () => {
    const driverData = {
        type: "DRIVER_NEW_PAID_ORDER",
        parentOrderId: "p_123",
    };

    const vendorData = {
        type: "NEW_VENDOR_ORDER",
        orderId: "p_123",
    };

    const driverResult = resolvePushSoundAndChannel(driverData);
    const vendorResult = resolvePushSoundAndChannel(vendorData);

    assert.equal(vendorResult.sound, driverResult.sound);
    assert.equal(vendorResult.channelId, driverResult.channelId);
    assert.equal(vendorResult.apnsSound, driverResult.apnsSound);
    assert.equal(vendorResult.sound, "order_alert");
    assert.equal(vendorResult.channelId, "new_paid_orders_v1");
    assert.equal(vendorResult.apnsSound, "order_alert.wav");
});

test("Notification Sound - Explicit sound and channel in payload are honored", () => {
    const data = {
        type: "CUSTOM_ALERT",
        sound: "special_bell",
        channelId: "special_channel",
    };

    const result = resolvePushSoundAndChannel(data);

    assert.equal(result.sound, "special_bell");
    assert.equal(result.channelId, "special_channel");
    assert.equal(result.apnsSound, "special_bell");
});

test("Notification Sound - General notification defaults to default sound and channel", () => {
    const data = {
        type: "admin_notification",
        screen: "NotificationDetails",
    };

    const result = resolvePushSoundAndChannel(data);

    assert.equal(result.isOrderAlert, false);
    assert.equal(result.sound, "default");
    assert.equal(result.channelId, "default");
    assert.equal(result.apnsSound, "default");
});

test("Notification Sound - Empty or undefined data defaults to default sound and channel", () => {
    const resultUndefined = resolvePushSoundAndChannel(undefined);
    assert.equal(resultUndefined.sound, "default");
    assert.equal(resultUndefined.channelId, "default");
    assert.equal(resultUndefined.apnsSound, "default");

    const resultEmpty = resolvePushSoundAndChannel({});
    assert.equal(resultEmpty.sound, "default");
    assert.equal(resultEmpty.channelId, "default");
    assert.equal(resultEmpty.apnsSound, "default");
});
