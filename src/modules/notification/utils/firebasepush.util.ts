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

export const firebaseAdminApp = initializeFirebaseAdmin();

export const firebaseMessaging = getMessaging(firebaseAdminApp);

const normalizeData = (data: Record<string, any> = {}): Record<string, string> => {
    const safeData: Record<string, string> = {};

    Object.keys(data || {}).forEach((key) => {
        safeData[key] = String(data[key]);
    });

    return safeData;
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
    const message: Message = {
        token,
        notification: {
            title,
            body,
        },
        data: normalizeData(data),
        android: {
            priority: "high",
            notification: {
                sound: "default",
                channelId: "default",
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                },
            },
        },
    };

    return await firebaseMessaging.send(message);
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

    const message: MulticastMessage = {
        tokens,
        notification: {
            title,
            body,
        },
        data: normalizeData(data),
        android: {
            priority: "high",
            notification: {
                sound: "default",
                channelId: "default",
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                },
            },
        },
    };

    return await firebaseMessaging.sendEachForMulticast(message);
};