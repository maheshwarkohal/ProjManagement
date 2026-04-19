import { Router } from "express";
import { verifyJWT, requireProjectMembership } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  getConversations,
  getProjectConversation,
  getOrCreateDirectChat,
  getConversationById,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  updateMessage,
  deleteMessage,
} from "../controllers/chat.controllers.js";
import {
  mongoIdParamValidator,
  updateMessageValidator,
} from "../ validators/index.js";

const router = Router();

router.use(verifyJWT);

router.route("/conversations").get(getConversations);

router.route("/projects/:projectId/conversation").get(
  mongoIdParamValidator("projectId"),
  validate,
  requireProjectMembership,
  getProjectConversation,
);

router.route("/direct/:userId").post(
  mongoIdParamValidator("userId"),
  validate,
  getOrCreateDirectChat,
);

router.route("/conversations/:conversationId").get(
  mongoIdParamValidator("conversationId"),
  validate,
  getConversationById,
);

router.route("/conversations/:conversationId/read").patch(
  mongoIdParamValidator("conversationId"),
  validate,
  markConversationRead,
);

router.route("/conversations/:conversationId/messages").get(
  mongoIdParamValidator("conversationId"),
  validate,
  getConversationMessages,
);

router.route("/conversations/:conversationId/messages").post(
  mongoIdParamValidator("conversationId"),
  validate,
  upload.array("attachments"),
  sendMessage,
);

router
  .route("/messages/:messageId")
  .patch(
    mongoIdParamValidator("messageId"),
    validate,
    updateMessageValidator(),
    validate,
    updateMessage,
  )
  .delete(
    mongoIdParamValidator("messageId"),
    validate,
    deleteMessage,
  );

export default router;
