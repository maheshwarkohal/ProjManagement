import mongoose from "mongoose";
import { SubTask } from "../models/subtask.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { AvailableTaskStatus } from "../utils/constants.js";
import {
  buildAttachments,
  ensureProjectExists,
  ensureProjectMemberUser,
  ensureTaskInProject,
  ensureSubtaskInProject,
} from "./task.helpers.js";

const getSubtasksByTaskId = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  await ensureProjectExists(projectId);
  await ensureTaskInProject(projectId, taskId);

  const subtasks = await SubTask.find({
    task: new mongoose.Types.ObjectId(taskId),
  })
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res
    .status(200)
    .json(new ApiResponse(200, subtasks, "Subtasks fetched successfully"));
});

const getSubtaskById = asyncHandler(async (req, res) => {
  const { projectId, subTaskId } = req.params;

  await ensureProjectExists(projectId);
  await ensureSubtaskInProject(projectId, subTaskId);

  const subtask = await SubTask.findById(subTaskId)
    .populate("task", "title project")
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res
    .status(200)
    .json(new ApiResponse(200, subtask, "Subtask fetched successfully"));
});

const createSubtask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description, assignedTo, status } = req.body;

  await ensureProjectExists(projectId);
  await ensureTaskInProject(projectId, taskId);

  if (assignedTo) {
    await ensureProjectMemberUser(projectId, assignedTo);
  }

  const attachments = buildAttachments(req.files || []);

  const subtask = await SubTask.create({
    title,
    description,
    task: new mongoose.Types.ObjectId(taskId),
    assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : null,
    assignedBy: new mongoose.Types.ObjectId(req.user._id),
    status,
    attachments,
  });

  const createdSubtask = await SubTask.findById(subtask._id)
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res
    .status(201)
    .json(new ApiResponse(201, createdSubtask, "Subtask created successfully"));
});

const updateSubtaskDetails = asyncHandler(async (req, res) => {
  const { projectId, subTaskId } = req.params;
  const { title, description, assignedTo } = req.body;

  await ensureProjectExists(projectId);
  await ensureSubtaskInProject(projectId, subTaskId);

  const updateFields = {};

  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;

  if (assignedTo !== undefined) {
    if (assignedTo) {
      await ensureProjectMemberUser(projectId, assignedTo);
      updateFields.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    } else {
      updateFields.assignedTo = null;
    }
  }

  const updatedSubtask = await SubTask.findByIdAndUpdate(subTaskId, updateFields, {
    new: true,
    runValidators: true,
  })
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedSubtask, "Subtask updated successfully"));
});

const updateSubtaskStatus = asyncHandler(async (req, res) => {
  const { projectId, subTaskId } = req.params;
  const { status } = req.body;

  await ensureProjectExists(projectId);

  if (!AvailableTaskStatus.includes(status)) {
    throw new ApiError(400, "Invalid subtask status");
  }

  await ensureSubtaskInProject(projectId, subTaskId);

  const updatedSubtask = await SubTask.findByIdAndUpdate(
    subTaskId,
    { status },
    {
      new: true,
      runValidators: true,
    },
  )
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res.status(200).json(
    new ApiResponse(200, updatedSubtask, "Subtask status updated successfully"),
  );
});

const deleteSubtask = asyncHandler(async (req, res) => {
  const { projectId, subTaskId } = req.params;

  await ensureProjectExists(projectId);

  const subtask = await SubTask.findById(subTaskId)
    .populate("task", "project")
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  if (subtask.task?.project?.toString() !== projectId) {
    throw new ApiError(404, "Subtask not found in this project");
  }

  await SubTask.deleteOne({ _id: subtask._id });

  return res
    .status(200)
    .json(new ApiResponse(200, subtask, "Subtask deleted successfully"));
});

export {
  getSubtasksByTaskId,
  getSubtaskById,
  createSubtask,
  updateSubtaskDetails,
  updateSubtaskStatus,
  deleteSubtask,
};
