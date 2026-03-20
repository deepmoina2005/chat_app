import express from "express";
import cors from "cors";
import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import {auth} from "./lib/auth.js"
import { friendRouter } from "./modules/friend/friend.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { userRouter } from "./modules/user/user.routes.js";

import { createServer } from "http";
import { setupSocketIo } from "./lib/socket.js";

const app = express()
app.set("trust proxy", true)
const httpServer = createServer(app)

export const io = setupSocketIo(httpServer)

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes(origin + "/") || (origin.endsWith(".vercel.app"))) {
      callback(null, true);
    } else {
      console.log("CORS Blocked Origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.all("/api/auth/*", toNodeHandler(auth));
// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());



app.use("/api/friends" , friendRouter)
app.use("/api/chat" , chatRouter)
app.use("/api/user" , userRouter)

app.get("/" , (req , res)=>{
    res.send("Hello World from Backend!")
})

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.IO server is ready`);
});

export default app;
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
