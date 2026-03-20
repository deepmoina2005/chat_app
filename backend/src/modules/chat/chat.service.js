import { prisma } from "../../lib/db.js";
import { isUserOnline } from "../../lib/socket.js";

function normalizePair(a, b) {
  return a < b ? [a, b] : [b, a];
}

export const sendMessage = async (senderId, receiverId, content, imageUrl = null) => {
  if (!content && !imageUrl) {
    throw new Error("message content or image cannot be empty");
  }
  if (senderId === receiverId) {
    throw new Error("You cannot send a messages to yourself");
  }

  const [u1, u2] = normalizePair(senderId, receiverId);

  const existingFriend = await prisma.friend.findFirst({
    where: {
      userId1: u1,
      userId2: u2,
    },
  });

  if (!existingFriend) {
    throw new Error("you can only send messages to friends");
  }

  // Check if blocked
  const isBlocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: receiverId },
        { blockerId: receiverId, blockedId: senderId }
      ]
    }
  });

  if (isBlocked) {
    throw new Error("Cannot send message. User is blocked.");
  }

  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId,
      content,
      imageUrl,
    },
  });

  return message;
};

export const getMessages = async (
  userId1,
  userId2,
  limit = 50,
  cursor = null,
) => {
  const where = {
    OR: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 },
    ],
    NOT: {
      OR: [
        { senderId: userId1, deletedForSender: true },
        { receiverId: userId1, deletedForReceiver: true }
      ]
    }
  };

  if (cursor) {
    where.AND = {
      createdAt: { lt: new Date(cursor) },
    };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: results.reverse(),
    hasMore,
    nextCursor: hasMore
      ? results[results.length - 1].createdAt.toISOString()
      : null,
  };
};

export const markMessagesAsRead = async (userId, senderId) => {
  await prisma.message.updateMany({
    where: {
      senderId,
      receiverId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
};

export const clearChat = async (userId, otherUserId) => {
  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
  });
};

export const deleteMessageContent = async (messageId, userId, type = "everyone") => {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error("Message not found");
  
  if (type === "everyone") {
    if (message.senderId !== userId) throw new Error("Unauthorized");
    return prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: "" }
    });
  } else if (type === "me") {
    if (message.senderId === userId) {
      return prisma.message.update({
        where: { id: messageId },
        data: { deletedForSender: true }
      });
    } else if (message.receiverId === userId) {
      return prisma.message.update({
        where: { id: messageId },
        data: { deletedForReceiver: true }
      });
    } else {
      throw new Error("Unauthorized");
    }
  }
};

export async function getConversation(userId) {
  const friendShips = await prisma.friend.findMany({
    where: {
      OR: [
        {
          userId1: userId,
        },
        {
          userId2: userId,
        },
      ],
    },
    include: {
      user1: {
        select: { id: true, name: true, image: true, lastSeen: true, about: true },
      },
      user2: {
        select: { id: true, name: true, image: true, lastSeen: true, about: true },
      },
    },
  });

  const friends = friendShips.map((f) =>
    f.userId1 === userId ? f.user2 : f.user1,
  );

  const friendIds = friends.map((f) => f.id);

  const allMessages = await prisma.message.findMany({
    where: {
      OR: [
        {
          senderId: userId,
          receiverId: {
            in: friendIds,
          },
        },
        { senderId: { in: friendIds }, receiverId: userId },
      ],
      NOT: {
        OR: [
          { senderId: userId, deletedForSender: true },
          { receiverId: userId, deletedForReceiver: true }
        ]
      }
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const lastMessages = new Map();
  const unreadCounts = new Map();

  allMessages.forEach((msg) => {
    const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;

    if (!lastMessages.has(partnerId)) {
      lastMessages.set(partnerId, msg);
    }

    if (
      msg.senderId === partnerId &&
      msg.receiverId === userId &&
      !msg.isRead
    ) {
      unreadCounts.set(partnerId, (unreadCounts.get(partnerId) || 0) + 1);
    }
  });

  const conversations = await Promise.all(friends.map(async (friend) => {
    return {
      ...friend,
      lastMessage: lastMessages.get(friend.id) || null,
      unreadCount: unreadCounts.get(friend.id) || 0,
      isOnline: isUserOnline(friend.id),
      isBlocked: await prisma.block.findUnique({
        where: {
          blockerId_blockedId: { blockerId: userId, blockedId: friend.id }
        }
      }) ? true : false,
      lastSeen: friend.lastSeen,
    };
  }));

  return conversations.sort((a, b) => {
    const timeA = a.lastMessage?.createdAt || new Date(0);
    const timeB = b.lastMessage?.createdAt || new Date(0);
    return timeB - timeA;
  });
}

export async function deleteConversation(userId, otherUserId) {
  // Delete the friend relationship (unfriend)
  const [u1, u2] = normalizePair(userId, otherUserId);
  
  await prisma.friend.deleteMany({
    where: { userId1: u1, userId2: u2 }
  });

  // Delete all messages in this conversation (hard delete for both)
  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    }
  });

  return { success: true };
}
