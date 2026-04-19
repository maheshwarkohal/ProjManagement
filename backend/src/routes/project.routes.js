import { Router } from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addMembersToProject,
  getProjectMembers,
  updateMemberRole,
  deleteMember,
} from "../controllers/project.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createProjectValidator,
  updateProjectValidator,
  addMemberToProjectValidator,
  updateMemberRoleValidator,
  mongoIdParamValidator,
} from "../ validators/index.js";
import {
  requireProjectMembership,
  requireProjectRoles,
  verifyJWT,
} from "../middlewares/auth.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";

const router = Router();
router.use(verifyJWT);

router
  .route("/")
  .get(getProjects)
  .post(createProjectValidator(), validate, createProject);

router
  .route("/:projectId")
  .get(mongoIdParamValidator("projectId"), validate, requireProjectMembership, getProjectById)
  .put(
    mongoIdParamValidator("projectId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    updateProjectValidator(),
    validate,
    updateProject,
  )
  .delete(
    mongoIdParamValidator("projectId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    deleteProject,
  );

router
  .route("/:projectId/members")
  .get(
    mongoIdParamValidator("projectId"),
    validate,
    requireProjectMembership,
    getProjectMembers,
  )
  .post(
    mongoIdParamValidator("projectId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    addMemberToProjectValidator(),
    validate,
    addMembersToProject,
  );

router
  .route("/:projectId/members/:userId")
  .put(
    mongoIdParamValidator("projectId", "userId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    updateMemberRoleValidator(),
    validate,
    updateMemberRole,
  )
  .delete(
    mongoIdParamValidator("projectId", "userId"),
    validate,
    requireProjectMembership,
    requireProjectRoles([UserRolesEnum.ADMIN]),
    deleteMember,
  );

export default router;
