import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["project", "direct"],
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    directConversationKey: {
      type: String,
      default: null,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessageText: {
      type: String,
      default: "",
    },
    lastMessageSender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

conversationSchema.index(
  { project: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "project",
      project: { $type: "objectId" },
    },
  },
);

conversationSchema.index(
  { directConversationKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "direct",
      directConversationKey: { $type: "string" },
    },
  },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
