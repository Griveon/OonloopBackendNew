import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

/**
 * Socket layer scoped to the PERSONAL SHOPPER flow only.
 * Riders connect, join the "riders" room, and receive ride requests.
 * First rider to accept (via socket "accept_ride" or the HTTP /accept API) wins.
 */
let io: Server | null = null;

export function initShopperSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, { cors: { origin: "*" } });

    // auth via JWT in the handshake (auth.token or ?token=)
    io.use((socket, next) => {
        try {
            const token =
                (socket.handshake.auth as any)?.token ||
                (socket.handshake.query as any)?.token;
            if (!token) return next(new Error("No token"));
            const decoded: any = jwt.verify(String(token), process.env.JWT_SECRET as string);
            (socket as any).userId = decoded.id;
            next();
        } catch {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const userId = (socket as any).userId;
        socket.join("riders");            // any authenticated rider-app socket
        socket.join(`user:${userId}`);

        // Rider accepts a broadcast request over the socket.
        socket.on("accept_ride", async (payload: any, cb?: Function) => {
            try {
                const bookingId = payload?.bookingId;
                const { PersonalShopperService } = await import(
                    "../modules/personalshopper/services/personalshopper.service.js"
                );
                const svc = new PersonalShopperService();
                await svc.acceptBooking(bookingId, userId);
                cb?.({ ok: true, bookingId });
                socket.emit("ride_assigned", { bookingId });
            } catch (e: any) {
                cb?.({ ok: false, message: e.message });
            }
        });
    });

    return io;
}

/** Broadcast a new shopper request to all connected riders. */
export function emitRideRequest(payload: any) {
    io?.to("riders").emit("ride_request", payload);
}

/** Tell riders a request was taken so they can drop it from their list. */
export function emitRideTaken(bookingId: string) {
    io?.to("riders").emit("ride_taken", { bookingId });
}
