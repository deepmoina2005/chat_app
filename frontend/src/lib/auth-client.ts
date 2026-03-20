import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_SOCKET_URL || "http://localhost:3000", // Base URL of your Better Auth backend.
});
