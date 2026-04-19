import mongoose, { Schema } from "mongoose";

const conversationReadStateSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: null,
    },
    lastReadMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true },
);

conversationReadStateSchema.index({ conversation: 1, user: 1 }, { unique: true });

export const ConversationReadState = mongoose.model(
  "ConversationReadState",
  conversationReadStateSchema,
);
