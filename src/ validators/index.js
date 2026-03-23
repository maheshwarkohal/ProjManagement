import { body } from "express-validator";

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

export {
  userRegisterValidator,
  userLoginValidator,
  changeCurrentPasswordValidator,
  forgotPasswordRequestValidator,
  resetForgotPasswordValidator,
};
