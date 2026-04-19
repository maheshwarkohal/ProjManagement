import { Router } from "express";
import { validate } from "../middlewares/validator.middleware.js";
import {
  requireProjectMembership,
  requireProjectRoles,
  verifyJWT,
} from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTaskDetails,
  updateTaskStatus,
  deleteTask,
} from "../controllers/task.controllers.js";
import {
  getSubtasksByTaskId,
  getSubtaskById,
  createSubtask,
  updateSubtaskDetails,
  updateSubtaskStatus,
  deleteSubtask,
} from "../controllers/subtask.controllers.js";
import {
  createTaskValidator,
  updateTaskDetailsValidator,
  updateTaskStatusValidator,
  createSubtaskValidator,
  updateSubtaskDetailsValidator,
  updateSubtaskStatusValidator,
  mongoIdParamValidator,
} from "../ validators/index.js";
import { UserRolesEnum } from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/:projectId")
  .get(
    mongoIdParamValidator("projectId"),
    validate,
    requireProjectMembership,
    getTasks,
  )
  .post(
    mongoIdParamValidator("projectId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    upload.array("attachments"),
    createTaskValidator(),
    validate,
    createTask,
  );

router
  .route("/:projectId/t/:taskId")
  .get(
    mongoIdParamValidator("projectId", "taskId"),
    validate,
    requireProjectMembership,
    getTaskById,
  )
  .put(
    mongoIdParamValidator("projectId", "taskId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    updateTaskDetailsValidator(),
    validate,
    updateTaskDetails,
  )
  .delete(
    mongoIdParamValidator("projectId", "taskId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    deleteTask,
  );

router.route("/:projectId/t/:taskId/status").patch(
  mongoIdParamValidator("projectId", "taskId"),
  validate,
  requireProjectMembership,
  updateTaskStatusValidator(),
  validate,
  updateTaskStatus,
);

router
  .route("/:projectId/t/:taskId/subtasks")
  .get(
    mongoIdParamValidator("projectId", "taskId"),
    validate,
    requireProjectMembership,
    getSubtasksByTaskId,
  )
  .post(
    mongoIdParamValidator("projectId", "taskId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    upload.array("attachments"),
    createSubtaskValidator(),
    validate,
    createSubtask,
  );

router
  .route("/:projectId/st/:subTaskId")
  .get(
    mongoIdParamValidator("projectId", "subTaskId"),
    validate,
    requireProjectMembership,
    getSubtaskById,
  )
  .put(
    mongoIdParamValidator("projectId", "subTaskId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    updateSubtaskDetailsValidator(),
    validate,
    updateSubtaskDetails,
  )
  .delete(
    mongoIdParamValidator("projectId", "subTaskId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    deleteSubtask,
  );

router.route("/:projectId/st/:subTaskId/status").patch(
  mongoIdParamValidator("projectId", "subTaskId"),
  validate,
  requireProjectMembership,
  updateSubtaskStatusValidator(),
  validate,
  updateSubtaskStatus,
);

export default router;
