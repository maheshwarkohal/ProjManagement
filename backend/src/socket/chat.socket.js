import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { Message } from "../models/message.models.js";
import { ApiError } from "../utils/api-error.js";
import {
  getAccessibleConversation,
  markConversationAsRead,
  touchConversationWithMessage,
} from "../controllers/chat.helpers.js";

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        throw new ApiError(401, "Unauthorized socket connection");
      }

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken -emailVerificationExpiry -emailVerificationToken",
      );

      if (!user) {
        throw new ApiError(401, "Invalid socket user");
      }

      socket.user = user;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);

    socket.on("join_conversation", async ({ conversationId }, ack) => {
      try {
        const conversation = await getAccessibleConversation(
          conversationId,
          socket.user._id,
        );

        socket.join(`conversation:${conversation._id}`);

        if (conversation.type === "project" && conversation.project?._id) {
          socket.join(`project:${conversation.project._id}`);
        }

        const readState = await markConversationAsRead(
          conversation._id,
          socket.user._id,
        );

        io.to(`user:${socket.user._id}`).emit("conversation:read", {
          conversationId: conversation._id.toString(),
          unreadCount: 0,
          lastReadAt: readState.lastReadAt,
        });

        ack?.({
          success: true,
          conversationId: conversation._id.toString(),
        });
      } catch (error) {
        ack?.({
          success: false,
          message: error.message || "Failed to join conversation",
        });
      }
    });

    socket.on("leave_conversation", ({ conversationId }, ack) => {
      socket.leave(`conversation:${conversationId}`);
      ack?.({ success: true });
    });

    socket.on("send_message", async ({ conversationId, content }, ack) => {
      try {
        const trimmedContent = content?.trim() || "";

        if (!trimmedContent) {
          throw new ApiError(400, "Message content is required");
        }

        const conversation = await getAccessibleConversation(
          conversationId,
          socket.user._id,
        );

        const message = await Message.create({
          conversation: conversation._id,
          sender: socket.user._id,
          content: trimmedContent,
        });

        const populatedMessage = await Message.findById(message._id).populate(
          "sender",
          "username fullName avatar",
        );

        await touchConversationWithMessage(
          conversation._id,
          socket.user._id,
          trimmedContent,
        );

        io.to(`conversation:${conversation._id}`).emit("message:new", populatedMessage);
        io.to(`conversation:${conversation._id}`).emit("conversation:updated", {
          conversationId: conversation._id.toString(),
          preview: trimmedContent,
        });

        if (conversation.type === "direct") {
          conversation.participants.forEach((participant) => {
            io.to(`user:${participant._id}`).emit("conversation:updated", {
              conversationId: conversation._id.toString(),
              preview: trimmedContent,
            });
          });
        }

        if (conversation.type === "project" && conversation.project?._id) {
          io.to(`project:${conversation.project._id}`).emit("conversation:updated", {
            conversationId: conversation._id.toString(),
            preview: trimmedContent,
          });
        }

        ack?.({
          success: true,
          message: populatedMessage,
        });
      } catch (error) {
        ack?.({
          success: false,
          message: error.message || "Failed to send message",
        });
      }
    });
  });

  return io;
};

export { initializeSocket };
