import { sendNewMessageNotification } from "../../lib/push-notification.js";
import { isUserOnline } from "../../lib/socket.js";
import cloudinary from "../../lib/cloudinary.js";
import { getConversation, getMessages, markMessagesAsRead, sendMessage, clearChat, deleteMessageContent } from "./chat.service.js";
import { prisma } from "../../lib/db.js";

export async function send(req , res) {
    try {
        const senderId = req.user.id;
        const {receiverId , content, imageUrl} = req.body;

        const result = await sendMessage(senderId , receiverId , content, imageUrl);

      const {io} = await import("../../index.js");

      const conversationId = [senderId , receiverId].sort().join("-");

      io.to(conversationId).emit("new_message" , result)

       io.to(receiverId).emit("notification:new_message", result);
    io.to(senderId).emit("notification:new_message", result);

    if(!isUserOnline(receiverId) && receiverId !== senderId){
        const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { pushToken: true },
      });

      if(receiver?.pushToken){
           const senderName = req.user.name || req.user.username || "Someone";
        const truncatedContent =
          content.length > 50 ? content.substring(0, 50) + "..." : content;

          sendNewMessageNotification(
             receiver.pushToken,
          senderName,
          truncatedContent,
          req.user.avatar || req.user.profilePicture || null,
          senderId
          ).catch((err)=>console.error("Push notification failed" , err))
      }
    }

        return res.json(result);
    } catch (error) {
        return res.status(400).json({message:"Failed to send message"})
    }
}

export async function listMessages(req , res) {
    try {
        const userId = req.user.id;
        const {otherUserId} = req.params;

        const {limit , cursor} = req.query;

        const result = await getMessages(
            userId,
            otherUserId,
            limit ? parseInt(limit) : undefined,
            cursor || undefined
        );

         return res.json(result);
    } catch (error) {
         return res.status(400).json({message:"Failed to fetch messages"})
    }
}

export async function markRead(req , res) {
    try {
        const userId = req.user.id;
        const {senderId}= req.body;

        await markMessagesAsRead(userId , senderId);

        const {io} = await import("../../index.js");
        const conversationId = [userId, senderId].sort().join("-");
        io.to(conversationId).emit("messages_read", { readerId: userId, senderId });

        return res.json({success:true})
    } catch (err) {
        return res
      .status(400)
      .json({ message: err.message || "Failed to mark messages as read" });
    }
}

export async function clear(req, res) {
    try {
        const userId = req.user.id;
        const { otherUserId } = req.params;

        await clearChat(userId, otherUserId);

        const {io} = await import("../../index.js");
        const conversationId = [userId, otherUserId].sort().join("-");
        io.to(conversationId).emit("chat_cleared", { byUserId: userId, otherUserId });

        return res.json({ success: true });
    } catch (err) {
        return res.status(400).json({ message: "Failed to clear chat" });
    }
}

export async function deleteMsg(req, res) {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;
        const type = req.query.type || "everyone"; // "me" or "everyone"
        
        const message = await deleteMessageContent(messageId, userId, type);
        
        if (type === "everyone") {
            const { io } = await import("../../index.js");
            const conversationId = [message.senderId, message.receiverId].sort().join("-");
            io.to(conversationId).emit("message_deleted", { messageId, conversationId, type: "everyone" });
        }
        
        return res.json({ success: true, messageId, type });
    } catch (err) {
        return res.status(400).json({ message: err.message || "Failed to delete message" });
    }
}

export async function uploadMedia(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Upload to Cloudinary using buffer
        const uploadResponse = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "chat_app_media",
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        return res.json({ 
            success: true, 
            imageUrl: uploadResponse.secure_url 
        });
    } catch (err) {
        console.error("Cloudinary upload error:", err);
        return res.status(500).json({ message: "Failed to upload image" });
    }
}

export async function listConversations(req , res) {
    try {
        const userId = req.user.id;
        const result = await getConversation(userId);

        return res.json(result);
    } catch (err) {
         return res
      .status(400)
      .json({ message: err.message || "Failed to fetch conversations" });
    }
}

export async function removeConversation(req, res) {
    try {
        const userId = req.user.id;
        const { otherUserId } = req.params;

        await deleteConversation(userId, otherUserId);

        const { io } = await import("../../index.js");
        io.to(userId).emit("conversation_deleted", { otherUserId });
        io.to(otherUserId).emit("conversation_deleted", { otherUserId: userId });

        return res.json({ success: true });
    } catch (err) {
        return res.status(400).json({ message: "Failed to delete conversation" });
    }
}

