export const UserRolesEnum = {
  ADMIN: "admin",
  MEMBER: "member",
};

export const AvailableUserRole = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
  TODO: "todo",
  ON_HOLD: "on_hold",
  IN_PROGRESS: "in_progress",
  TESTING: "testing",
  DONE: "done",
};

export const AvailableTaskStatus = Object.values(TaskStatusEnum);
