import {Router} from "express";
import {requireAuth} from "../../lib/require-auth.js";
import { listConversations, listMessages, markRead, send, clear, deleteMsg, uploadMedia, removeConversation } from "./chat.controller.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export const chatRouter = Router();

chatRouter.use(requireAuth);

chatRouter.post("/send" ,send)
chatRouter.post("/mark-read" , markRead)
chatRouter.get("/messages/:otherUserId" , listMessages)
chatRouter.get("/conversations",listConversations)
chatRouter.delete("/clear/:otherUserId", clear)
chatRouter.delete("/conversation/:otherUserId", removeConversation)
chatRouter.post("/media", upload.single("image"), uploadMedia)