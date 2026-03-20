import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";
import { expo } from "@better-auth/expo";

export const auth = betterAuth({
  plugins: [expo()],
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "chat://",
    "http://localhost:5173",
    "http://192.168.31.113:5173",
    process.env.FRONTEND_URL,
    ...(process.env.NODE_ENV !== "production"
      ? [
          "exp://",
          "exp://**",
          "exp://192.168.*.*:*/**",
        ]
      : []),
  ],
  debug: process.env.NODE_ENV !== "production",
  allowDangerousConnections: process.env.NODE_ENV !== "production",
});
