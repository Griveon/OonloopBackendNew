import dotenv from "dotenv";
import {
    cert,
    getApps,
    initializeApp,
    type App,
    type ServiceAccount,
} from "firebase-admin/app";
import {
    getMessaging,
    type Message,
    type MulticastMessage,
} from "firebase-admin/messaging";

dotenv.config();

let firebaseApp: any | null = null;

const initializeFirebaseAdmin = (): App => {
    if (firebaseApp) {
        return firebaseApp;
    }

    const existingApps = getApps();

    if (existingApps.length > 0) {
        firebaseApp = existingApps[0];
        return firebaseApp;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Firebase admin env missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY"
        );
    }

    const serviceAccount: ServiceAccount = {
        projectId,
        clientEmail,
        privateKey,
    };

    firebaseApp = initializeApp({
        credential: cert(serviceAccount),
    });

    return firebaseApp;
};

export const getFirebaseAdminApp = (): App => initializeFirebaseAdmin();

export const getFirebaseMessaging = () => {
    return getMessaging(initializeFirebaseAdmin());
};

export const firebaseAdminApp: App = (() => {
    try {
        return initializeFirebaseAdmin();
    } catch {
        return null as any;
    }
})();

export const firebaseMessaging = (() => {
    try {
        return firebaseAdminApp ? getMessaging(firebaseAdminApp) : null as any;
    } catch {
        return null as any;
    }
})();

const normalizeData = (data: Record<string, any> = {}): Record<string, string> => {
    const safeData: Record<string, string> = {};

    Object.keys(data || {}).forEach((key) => {
        safeData[key] = String(data[key]);
    });

    return safeData;
};

const ORDER_ALERT_TYPES = new Set([
    "DRIVER_NEW_PAID_ORDER",
    "DRIVER_NEW_MANUAL_DELIVERY",
    "MANUAL_DELIVERY_ASSIGNED",
    "NEW_DELIVERY_ORDER_AVAILABLE",
    "NEW_VENDOR_ORDER",
    "VENDOR_NEW_ORDER",
    "VENDOR_ORDER",
    "VENDOR_ORDER_STATUS_UPDATED",
    "MANUAL_DELIVERY_STATUS_UPDATED",
]);

export const resolvePushSoundAndChannel = (data?: Record<string, any>) => {
    const notificationType = data?.type;

    const isOrderAlert = Boolean(
        (notificationType && ORDER_ALERT_TYPES.has(notificationType)) ||
        data?.sound === "order_alert" ||
        data?.channelId === "new_paid_orders_v1" ||
        (typeof notificationType === "string" &&
            (notificationType.includes("ORDER") || notificationType.includes("MANUAL_DELIVERY")) &&
            !notificationType.includes("ADMIN"))
    );

    const sound =
        data?.sound && data.sound !== "default"
            ? String(data.sound)
            : isOrderAlert
            ? "order_alert"
            : "default";

    const channelId =
        data?.channelId && data.channelId !== "default"
            ? String(data.channelId)
            : isOrderAlert
            ? "new_paid_orders_v1"
            : "default";

    const apnsSound =
        sound === "order_alert"
            ? "order_alert.wav"
            : sound;

    return {
        isOrderAlert,
        sound,
        channelId,
        apnsSound,
    };
};

export const sendFirebaseNotificationToToken = async ({
    token,
    title,
    body,
    data = {},
}: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}) => {
    const { sound, channelId, apnsSound } = resolvePushSoundAndChannel(data);

    const message: Message = {
        token,
        notification: {
            title,
            body,
        },
        data: normalizeData({
            ...data,
            sound,
            channelId,
        }),
        android: {
            priority: "high",
            notification: {
                sound,
                channelId,
            },
        },
        apns: {
            headers: {
                "apns-priority": "10",
            },
            payload: {
                aps: {
                    alert: {
                        title,
                        body,
                    },
                    sound: apnsSound,
                    contentAvailable: true,
                },
            },
        },
    };

    const messaging = firebaseMessaging || getFirebaseMessaging();
    return await messaging.send(message);
};

export const sendFirebaseNotificationToMultipleTokens = async ({
    tokens,
    title,
    body,
    data = {},
}: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
}) => {
    if (!tokens.length) {
        return {
            successCount: 0,
            failureCount: 0,
            responses: [],
        };
    }

    const { sound, channelId, apnsSound } = resolvePushSoundAndChannel(data);

    const message: MulticastMessage = {
        tokens,

        notification: {
            title,
            body,
        },

        data: normalizeData({
            ...data,
            sound,
            channelId,
        }),

        android: {
            priority: "high",

            notification: {
                sound,
                channelId,
            },
        },

        apns: {
            headers: {
                "apns-priority": "10",
            },

            payload: {
                aps: {
                    alert: {
                        title,
                        body,
                    },
                    sound: apnsSound,
                    contentAvailable: true,
                },
            },
        },
    };

    const messaging = firebaseMessaging || getFirebaseMessaging();
    return await messaging.sendEachForMulticast(message);
};