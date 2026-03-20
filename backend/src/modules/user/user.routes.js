import { Router } from "express";
import { requireAuth } from "../../lib/require-auth.js";
import { prisma } from "../../lib/db.js";
import multer from "multer";
import cloudinary from "../../lib/cloudinary.js";

const upload = multer({ storage: multer.memoryStorage() });

export const userRouter = Router();

userRouter.use(requireAuth);

// Get user info by ID
userRouter.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phoneNumber: true,
        about: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    return res
      .status(400)
      .json({ message: err.message || "Failed to fetch user" });
  }
});

// Get notification counts
userRouter.get("/notifications/counts", async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadMessagesCount = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    const pendingFriendRequestsCount = await prisma.friendRequest.count({
      where: {
        receiverId: userId,
        status: "PENDING",
      },
    });

    return res.json({
      unreadMessages: unreadMessagesCount,
      pendingFriendRequests: pendingFriendRequestsCount,
    });
  } catch (err) {
    return res
      .status(400)
      .json({ message: err.message || "Failed to fetch notification counts" });
  }
});

userRouter.post("/push-token", async (req, res) => {
  try {
    const userId = req.user.id;
    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ message: "Push token is required" });
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        pushToken,
      },
    });

    return res.json({ message: "Push token saved successfully" });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to save push token" });
  }
});

// Update profile name
userRouter.patch("/profile", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phoneNumber, about } = req.body;

    if (!name && !phoneNumber && !about) {
      return res.status(400).json({ message: "Name, Phone Number or About is required" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        ...(name && { name }),
        ...(phoneNumber && { phoneNumber }),
        ...(about && { about })
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phoneNumber: true,
        about: true,
      },
    });
    const { io } = await import("../../index.js");
    io.emit("profile_updated", updatedUser);

    return res.json(updatedUser);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update profile" });
  }
});

// Upload profile picture
userRouter.post("/profile-picture", upload.single("image"), async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload to Cloudinary
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "chat_app_profiles",
          transformation: [{ width: 500, height: 500, crop: "fill" }],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: uploadResponse.secure_url },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phoneNumber: true,
        about: true,
      },
    });
    const { io } = await import("../../index.js");
    io.emit("profile_updated", updatedUser);

    return res.json(updatedUser);
  } catch (err) {
    console.error("Profile picture upload error:", err);
    return res.status(500).json({ message: "Failed to upload profile picture" });
  }
});

// Search user by phone number
userRouter.get("/search/phone", async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber: phoneNumber.toString() },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phoneNumber: true,
        about: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found with this phone number" });
    }

    return res.json(user);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Search failed" });
  }
});

// Block a user
userRouter.post("/block/:targetUserId", async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;

    if (userId === targetUserId) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const block = await prisma.block.upsert({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: targetUserId }
      },
      create: { blockerId: userId, blockedId: targetUserId },
      update: {}
    });

    return res.json({ success: true, block });
  } catch (err) {
    return res.status(400).json({ message: "Failed to block user" });
  }
});

// Unblock a user
userRouter.post("/unblock/:targetUserId", async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;

    await prisma.block.delete({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: targetUserId }
      }
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: "Failed to unblock user" });
  }
});

// Get blocked users
userRouter.get("/blocked", async (req, res) => {
  try {
    const userId = req.user.id;
    const blocked = await prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, name: true, image: true } } }
    });
    return res.json(blocked.map(b => b.blocked));
  } catch (err) {
    return res.status(400).json({ message: "Failed to fetch blocked users" });
  }
});
