import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { SubTask } from "../models/subtask.models.js";
import { ApiError } from "../utils/api-error.js";

const buildAttachments = (files = []) => {
  return files.map((file) => ({
    url: `${process.env.SERVER_URL}/images/${file.filename}`,
    mimetype: file.mimetype,
    size: file.size,
  }));
};

const ensureProjectExists = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return project;
};

const ensureProjectMemberUser = async (projectId, userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "Assigned user not found");
  }

  const projectMember = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!projectMember) {
    throw new ApiError(400, "Assigned user must be a member of this project");
  }

  return user;
};

const ensureTaskInProject = async (projectId, taskId) => {
  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return task;
};

const ensureSubtaskInProject = async (projectId, subTaskId) => {
  const subtask = await SubTask.findById(subTaskId).populate("task", "project");

  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  if (subtask.task?.project?.toString() !== projectId) {
    throw new ApiError(404, "Subtask not found in this project");
  }

  return subtask;
};

export {
  buildAttachments,
  ensureProjectExists,
  ensureProjectMemberUser,
  ensureTaskInProject,
  ensureSubtaskInProject,
};
