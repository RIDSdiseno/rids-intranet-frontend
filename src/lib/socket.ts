import { io, Socket } from "socket.io-client";

const SOCKET_URL =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:4000";

export const socket: Socket = io(SOCKET_URL, {
    transports: ["websocket"],
    path: import.meta.env.VITE_SOCKET_PATH || "/socket.io",
    withCredentials: true,
    autoConnect: false,
});
