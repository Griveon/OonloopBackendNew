import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { initShopperSocket } from "./config/socket.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectDatabase();

        const server = http.createServer(app);
        initShopperSocket(server); // personal-shopper ride-request sockets

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed", error);
        process.exit(1);
    }
}

startServer();