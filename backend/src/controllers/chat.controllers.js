import mongoose from "mongoose";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Conversation } from "../models/conversation.models.js";
import { Message } from "../models/message.models.js";
import {
  buildMessageAttachments,
  ensureProjectMembership,
  getOrCreateProjectConversation,
  getOrCreateDirectConversation,
  getAccessibleConversation,
  getUnreadCountForConversation,
  markConversationAsRead,
  refreshConversationLastMessage,
  touchConversationWithMessage,
} from "./chat.helpers.js";

const formatConversation = (conversation, currentUserId) => {
  const plainConversation =
    typeof conversation.toObject === "function"
      ? conversation.toObject()
      : conversation;

  if (plainConversation.type === "project") {
    return {
      ...plainConversation,
      displayName: plainConversation.project?.name || "Project Chat",
    };
  }

  const otherParticipant = plainConversation.participants.find(
    (participant) => participant._id.toString() !== currentUserId.toString(),
  );

  return {
    ...plainConversation,
    displayName: otherParticipant?.fullName || otherParticipant?.username || "Direct Chat",
    otherParticipant,
  };
};

const hydrateConversationsWithUnreadCounts = async (conversations, currentUserId) => {
  return Promise.all(
    conversations.map(async (conversation) => {
      const formattedConversation = formatConversation(conversation, currentUserId);
      const unreadCount = await getUnreadCountForConversation(
        formattedConversation._id,
        currentUserId,
      );

      return {
        ...formattedConversation,
        unreadCount,
      };
    }),
  );
};

const getConversations = asyncHandler(async (req, res) => {
  const memberships = await ProjectMember.find({
    user: new mongoose.Types.ObjectId(req.user._id),
  }).populate("project", "name description");

  const projectConversations = await Promise.all(
    memberships.map((membership) =>
      getOrCreateProjectConversation(membership.project._id, req.user._id),
    ),
  );

  const directConversations = await Conversation.find({
    type: "direct",
    participants: new mongoose.Types.ObjectId(req.user._id),
  })
    .populate("participants", "username fullName avatar")
    .populate("lastMessageSender", "username fullName avatar");

  const conversations = [...projectConversations, ...directConversations]
    .sort((conversationA, conversationB) => {
      const left = new Date(
        conversationA.lastMessageAt || conversationA.updatedAt,
      ).getTime();
      const right = new Date(
        conversationB.lastMessageAt || conversationB.updatedAt,
      ).getTime();

      return right - left;
    });

  const hydratedConversations = await hydrateConversationsWithUnreadCounts(
    conversations,
    req.user._id,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        hydratedConversations,
        "Conversations fetched successfully",
      ),
    );
});

const getProjectConversation = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  await ensureProjectMembership(projectId, req.user._id);

  const conversation = await getOrCreateProjectConversation(projectId, req.user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      formatConversation(conversation, req.user._id),
      "Project conversation fetched successfully",
    ),
  );
});

const getOrCreateDirectChat = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const conversation = await getOrCreateDirectConversation(req.user._id, userId);

  return res.status(200).json(
    new ApiResponse(
      200,
      formatConversation(conversation, req.user._id),
      "Direct conversation ready",
    ),
  );
});

const getConversationById = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await getAccessibleConversation(conversationId, req.user._id);
  await markConversationAsRead(conversationId, req.user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...formatConversation(conversation, req.user._id),
        unreadCount: 0,
      },
      "Conversation fetched successfully",
    ),
  );
});

const getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const skip = (page - 1) * limit;

  await getAccessibleConversation(conversationId, req.user._id);
  await markConversationAsRead(conversationId, req.user._id);

  const [messages, total] = await Promise.all([
    Message.find({
      conversation: new mongoose.Types.ObjectId(conversationId),
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "username fullName avatar"),
    Message.countDocuments({
      conversation: new mongoose.Types.ObjectId(conversationId),
    }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Messages fetched successfully",
    ),
  );
});

const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const content = req.body.content?.trim() || "";
  const attachments = buildMessageAttachments(req.files || []);

  if (!content && attachments.length === 0) {
    throw new ApiError(400, "Message content or attachment is required");
  }

  const conversation = await getAccessibleConversation(conversationId, req.user._id);

  const message = await Message.create({
    conversation: new mongoose.Types.ObjectId(conversationId),
    sender: new mongoose.Types.ObjectId(req.user._id),
    content,
    attachments,
  });

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "username fullName avatar",
  );

  const preview = content || "Attachment";
  await touchConversationWithMessage(conversationId, req.user._id, preview);

  const io = req.io;
  const roomName = `conversation:${conversationId}`;

  if (io) {
    io.to(roomName).emit("message:new", populatedMessage);
    io.to(roomName).emit("conversation:updated", {
      conversationId,
      preview,
    });

    if (conversation.type === "direct") {
      conversation.participants.forEach((participant) => {
        io.to(`user:${participant._id}`).emit("conversation:updated", {
          conversationId,
          preview,
        });
      });
    }

    if (conversation.type === "project" && conversation.project?._id) {
      io.to(`project:${conversation.project._id}`).emit("conversation:updated", {
        conversationId,
        preview,
      });
    }
  }

  return res
    .status(201)
    .json(new ApiResponse(201, populatedMessage, "Message sent successfully"));
});

const markConversationRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await getAccessibleConversation(conversationId, req.user._id);
  const readState = await markConversationAsRead(conversationId, req.user._id);

  const io = req.io;
  if (io) {
    io.to(`user:${req.user._id}`).emit("conversation:read", {
      conversationId: conversation._id.toString(),
      unreadCount: 0,
      lastReadAt: readState.lastReadAt,
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        conversationId: conversation._id,
        unreadCount: 0,
        lastReadAt: readState.lastReadAt,
      },
      "Conversation marked as read",
    ),
  );
});

const updateMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const content = req.body.content?.trim() || "";

  if (!content) {
    throw new ApiError(400, "Message content is required");
  }

  const message = await Message.findById(messageId).populate("sender", "username fullName avatar");

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.sender._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can edit only your own messages");
  }

  const conversation = await getAccessibleConversation(message.conversation, req.user._id);

  message.content = content;
  message.editedAt = new Date();
  await message.save();

  const updatedMessage = await Message.findById(message._id).populate(
    "sender",
    "username fullName avatar",
  );

  await refreshConversationLastMessage(conversation._id);

  const io = req.io;
  if (io) {
    io.to(`conversation:${conversation._id}`).emit("message:updated", updatedMessage);
    const preview = updatedMessage.content || "Attachment";
    io.to(`conversation:${conversation._id}`).emit("conversation:updated", {
      conversationId: conversation._id.toString(),
      preview,
    });

    if (conversation.type === "direct") {
      conversation.participants.forEach((participant) => {
        io.to(`user:${participant._id}`).emit("conversation:updated", {
          conversationId: conversation._id.toString(),
          preview,
        });
      });
    }

    if (conversation.type === "project" && conversation.project?._id) {
      io.to(`project:${conversation.project._id}`).emit("conversation:updated", {
        conversationId: conversation._id.toString(),
        preview,
      });
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedMessage, "Message updated successfully"));
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId).populate("sender", "username fullName avatar");

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.sender._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can delete only your own messages");
  }

  const conversation = await getAccessibleConversation(message.conversation, req.user._id);

  await Message.deleteOne({ _id: message._id });
  const refreshedConversation = await refreshConversationLastMessage(conversation._id);

  const io = req.io;
  if (io) {
    io.to(`conversation:${conversation._id}`).emit("message:deleted", {
      _id: message._id.toString(),
      conversation: conversation._id.toString(),
    });

    const preview = refreshedConversation?.lastMessageText || "";
    io.to(`conversation:${conversation._id}`).emit("conversation:updated", {
      conversationId: conversation._id.toString(),
      preview,
    });

    if (conversation.type === "direct") {
      conversation.participants.forEach((participant) => {
        io.to(`user:${participant._id}`).emit("conversation:updated", {
          conversationId: conversation._id.toString(),
          preview,
        });
      });
    }

    if (conversation.type === "project" && conversation.project?._id) {
      io.to(`project:${conversation.project._id}`).emit("conversation:updated", {
        conversationId: conversation._id.toString(),
        preview,
      });
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { _id: message._id, conversation: conversation._id },
      "Message deleted successfully",
    ),
  );
});

export {
  getConversations,
  getProjectConversation,
  getOrCreateDirectChat,
  getConversationById,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  updateMessage,
  deleteMessage,
};
