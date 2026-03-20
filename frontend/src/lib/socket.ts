import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "./utils";

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      query: { userId },
      transports: ["websocket"],
      withCredentials: true,
    });

    this.socket.on("connect", () => {
      console.log("Connected to socket");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, ...args: any[]) {
    this.socket?.emit(event, ...args);
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }
}

export const socketService = new SocketService();
