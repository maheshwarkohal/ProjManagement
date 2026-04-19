import mongoose from "mongoose";
import { ApiError } from "../utils/api-error.js";
import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Conversation } from "../models/conversation.models.js";
import { Message } from "../models/message.models.js";
import { ConversationReadState } from "../models/conversationreadstate.models.js";

const buildMessageAttachments = (files = []) => {
  return files.map((file) => ({
    url: `${process.env.SERVER_URL}/images/${file.filename}`,
    mimetype: file.mimetype,
    size: file.size,
  }));
};

const normalizeDirectConversationKey = (userIdA, userIdB) => {
  return [userIdA.toString(), userIdB.toString()].sort().join(":");
};

const ensureUserExists = async (userId, message = "User not found") => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, message);
  }

  return user;
};

const ensureProjectExists = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return project;
};

const ensureProjectMembership = async (projectId, userId) => {
  const membership = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!membership) {
    throw new ApiError(403, "You are not a member of this project");
  }

  return membership;
};

const ensureSharedProject = async (userIdA, userIdB) => {
  const sharedProjects = await ProjectMember.aggregate([
    {
      $match: {
        user: {
          $in: [
            new mongoose.Types.ObjectId(userIdA),
            new mongoose.Types.ObjectId(userIdB),
          ],
        },
      },
    },
    {
      $group: {
        _id: "$project",
        membersMatched: { $addToSet: "$user" },
      },
    },
    {
      $match: {
        "membersMatched.1": { $exists: true },
      },
    },
    {
      $limit: 1,
    },
  ]);

  if (sharedProjects.length === 0) {
    throw new ApiError(
      403,
      "Direct chat is allowed only between users who share a project",
    );
  }

  return sharedProjects[0]._id;
};

const getOrCreateProjectConversation = async (projectId, userId) => {
  const project = await ensureProjectExists(projectId);

  return Conversation.findOneAndUpdate(
    {
      type: "project",
      project: new mongoose.Types.ObjectId(projectId),
    },
    {
      $setOnInsert: {
        type: "project",
        project: new mongoose.Types.ObjectId(projectId),
        createdBy: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).populate("project", "name description");
};

const getOrCreateDirectConversation = async (currentUserId, otherUserId) => {
  if (currentUserId.toString() === otherUserId.toString()) {
    throw new ApiError(400, "You cannot start a direct chat with yourself");
  }

  await ensureUserExists(otherUserId, "Target user not found");
  await ensureSharedProject(currentUserId, otherUserId);

  const directConversationKey = normalizeDirectConversationKey(
    currentUserId,
    otherUserId,
  );

  return Conversation.findOneAndUpdate(
    {
      type: "direct",
      directConversationKey,
    },
    {
      $setOnInsert: {
        type: "direct",
        directConversationKey,
        participants: [
          new mongoose.Types.ObjectId(currentUserId),
          new mongoose.Types.ObjectId(otherUserId),
        ],
        createdBy: new mongoose.Types.ObjectId(currentUserId),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )
    .populate("participants", "username fullName avatar")
    .populate("lastMessageSender", "username fullName avatar");
};

const getAccessibleConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId)
    .populate("project", "name description")
    .populate("participants", "username fullName avatar")
    .populate("lastMessageSender", "username fullName avatar");

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (conversation.type === "project") {
    await ensureProjectMembership(conversation.project?._id, userId);
    return conversation;
  }

  const isParticipant = conversation.participants.some(
    (participant) => participant._id.toString() === userId.toString(),
  );

  if (!isParticipant) {
    throw new ApiError(403, "You do not have access to this conversation");
  }

  return conversation;
};

const touchConversationWithMessage = async (conversationId, senderId, preview) => {
  return Conversation.findByIdAndUpdate(
    conversationId,
    {
      lastMessageText: preview,
      lastMessageSender: new mongoose.Types.ObjectId(senderId),
      lastMessageAt: new Date(),
    },
    {
      new: true,
    },
  );
};

const refreshConversationLastMessage = async (conversationId) => {
  const latestMessage = await Message.findOne({
    conversation: new mongoose.Types.ObjectId(conversationId),
  }).sort({ createdAt: -1 });

  if (!latestMessage) {
    return Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessageText: "",
        lastMessageSender: null,
        lastMessageAt: null,
      },
      { new: true },
    );
  }

  return Conversation.findByIdAndUpdate(
    conversationId,
    {
      lastMessageText: latestMessage.content || "Attachment",
      lastMessageSender: latestMessage.sender,
      lastMessageAt: latestMessage.createdAt,
    },
    { new: true },
  );
};

const markConversationAsRead = async (conversationId, userId) => {
  const latestMessage = await Message.findOne({
    conversation: new mongoose.Types.ObjectId(conversationId),
  }).sort({ createdAt: -1 });

  const update = latestMessage
    ? {
        lastReadAt: latestMessage.createdAt,
        lastReadMessage: latestMessage._id,
      }
    : {
        lastReadAt: new Date(),
        lastReadMessage: null,
      };

  return ConversationReadState.findOneAndUpdate(
    {
      conversation: new mongoose.Types.ObjectId(conversationId),
      user: new mongoose.Types.ObjectId(userId),
    },
    update,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
};

const getUnreadCountForConversation = async (conversationId, userId) => {
  const readState = await ConversationReadState.findOne({
    conversation: new mongoose.Types.ObjectId(conversationId),
    user: new mongoose.Types.ObjectId(userId),
  });

  const unreadFilter = {
    conversation: new mongoose.Types.ObjectId(conversationId),
    sender: { $ne: new mongoose.Types.ObjectId(userId) },
  };

  if (readState?.lastReadAt) {
    unreadFilter.createdAt = { $gt: readState.lastReadAt };
  }

  return Message.countDocuments(unreadFilter);
};

export {
  buildMessageAttachments,
  normalizeDirectConversationKey,
  ensureUserExists,
  ensureProjectExists,
  ensureProjectMembership,
  ensureSharedProject,
  getOrCreateProjectConversation,
  getOrCreateDirectConversation,
  getAccessibleConversation,
  touchConversationWithMessage,
  refreshConversationLastMessage,
  markConversationAsRead,
  getUnreadCountForConversation,
};
