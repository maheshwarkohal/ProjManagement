import { body, param } from "express-validator";
import {
  AvailableTaskStatus,
  AvailableUserRole,
} from "../utils/constants.js";

const userRegisterValidator = () => {
  return [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("email")
      .trim()
      .isEmail()
      .notEmpty()
      .withMessage("Invalid email format"),
    body("password")
      .trim()
      .notEmpty()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("fullName").optional().trim(),
  ];
};

const userLoginValidator = () => {
  return [
    body("email")
      .trim()
      .isEmail()
      .notEmpty()
      .withMessage("Invalid email format"),
    body("password").notEmpty().withMessage("Password is required"),
  ];
};

const changeCurrentPasswordValidator = () => {
  return [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .trim()
      .notEmpty()
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long"),
  ];
};

const forgotPasswordRequestValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format"),
  ];
};

const resetForgotPasswordValidator = () => {
  return [
    body("newPassword")
      .trim()
      .notEmpty()
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long"),
  ];
};

const createProjectValidator = () => {
  return [
    body("name").trim().notEmpty().withMessage("Project name is required"),
    body("description").optional().trim(),
  ];
};

const updateProjectValidator = () => {
  return [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Project name cannot be empty"),
    body("description").optional().trim(),
  ];
};

const addMemberToProjectValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format"),
    body("role")
      .trim()
      .notEmpty()
      .withMessage("Role is required")
      .isIn(AvailableUserRole)
      .withMessage("Role is invalid, it can be either admin or member"),
  ];
};

const updateMemberRoleValidator = () => {
  return [
    body("newRole")
      .trim()
      .notEmpty()
      .withMessage("New role is required")
      .isIn(AvailableUserRole)
      .withMessage("Role is invalid, it can be either admin or member"),
  ];
};

const mongoIdParamValidator = (...paramNames) => {
  return paramNames.map((paramName) =>
    param(paramName)
      .isMongoId()
      .withMessage(`${paramName} must be a valid Mongo ID`),
  );
};

const createTaskValidator = () => {
  return [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Task title is required"),
    body("description").optional().trim(),
    body("assignedTo")
      .optional({ values: "falsy" })
      .isMongoId()
      .withMessage("Assigned user must be a valid user ID"),
    body("status")
      .optional()
      .isIn(AvailableTaskStatus)
      .withMessage("Task status is invalid"),
  ];
};

const updateTaskDetailsValidator = () => {
  return [
    body("title")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Task title cannot be empty"),
    body("description").optional().trim(),
    body("assignedTo")
      .optional({ values: "falsy" })
      .isMongoId()
      .withMessage("Assigned user must be a valid user ID"),
  ];
};

const updateTaskStatusValidator = () => {
  return [
    body("status")
      .trim()
      .notEmpty()
      .withMessage("Task status is required")
      .isIn(AvailableTaskStatus)
      .withMessage("Task status is invalid"),
  ];
};

const createSubtaskValidator = () => {
  return [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Subtask title is required"),
    body("description").optional().trim(),
    body("assignedTo")
      .optional({ values: "falsy" })
      .isMongoId()
      .withMessage("Assigned user must be a valid user ID"),
    body("status")
      .optional()
      .isIn(AvailableTaskStatus)
      .withMessage("Subtask status is invalid"),
  ];
};

const updateSubtaskDetailsValidator = () => {
  return [
    body("title")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Subtask title cannot be empty"),
    body("description").optional().trim(),
    body("assignedTo")
      .optional({ values: "falsy" })
      .isMongoId()
      .withMessage("Assigned user must be a valid user ID"),
  ];
};

const updateSubtaskStatusValidator = () => {
  return [
    body("status")
      .trim()
      .notEmpty()
      .withMessage("Subtask status is required")
      .isIn(AvailableTaskStatus)
      .withMessage("Subtask status is invalid"),
  ];
};

const updateMessageValidator = () => {
  return [
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Message content is required"),
  ];
};

export {
  userRegisterValidator,
  userLoginValidator,
  changeCurrentPasswordValidator,
  forgotPasswordRequestValidator,
  resetForgotPasswordValidator,
  createProjectValidator,
  updateProjectValidator,
  addMemberToProjectValidator,
  updateMemberRoleValidator,
  mongoIdParamValidator,
  createTaskValidator,
  updateTaskDetailsValidator,
  updateTaskStatusValidator,
  createSubtaskValidator,
  updateSubtaskDetailsValidator,
  updateSubtaskStatusValidator,
  updateMessageValidator,
};
