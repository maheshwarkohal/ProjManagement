import { Router } from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  toggleProjectStar,
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
  toggleProjectStarValidator,
  addMemberToProjectValidator,
  updateMemberRoleValidator,
  mongoIdParamValidator,
} from "../ validators/index.js";
import {
  requireProjectMembership,
  requireProjectRoles,
  verifyJWT,
} from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";

const router = Router();
router.use(verifyJWT);

router
  .route("/")
  .get(getProjects)
  .post(upload.single("coverImage"), createProjectValidator(), validate, createProject);

router
  .route("/:projectId")
  .get(mongoIdParamValidator("projectId"), validate, requireProjectMembership, getProjectById)
  .put(
    upload.single("coverImage"),
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

router.route("/:projectId/star").patch(
  mongoIdParamValidator("projectId"),
  validate,
  requireProjectMembership,
  toggleProjectStarValidator(),
  validate,
  toggleProjectStar,
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
