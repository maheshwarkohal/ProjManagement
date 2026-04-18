import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { Task } from "../models/task.models.js";
import { SubTask } from "../models/subtask.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import mongoose from "mongoose";
import { AvailableTaskStatus } from "../utils/constants.js";

const buildAttachments = (files = []) => {
  return files.map((file) => ({
    url: `${process.env.SERVER_URL}/images/${file.originalname}`,
    mimetype: file.mimetype,
    size: file.size,
  }));
};

const findProjectScopedSubTask = async ({ projectId, taskId, subTaskId }) => {
  const subtask = await SubTask.findById(subTaskId);

  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  const parentTask = await Task.findOne({
    _id: subtask.task,
    project: projectId,
  });

  if (!parentTask) {
    throw new ApiError(404, "Parent task not found");
  }

  if (
    taskId &&
    parentTask._id.toString() !== new mongoose.Types.ObjectId(taskId).toString()
  ) {
    throw new ApiError(404, "Subtask not found in this task");
  }

  return { subtask, parentTask };
};

const createSubtask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description, assignedTo, status } = req.body;

  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
  });

  if (!task) {
    throw new ApiError(404, "Parent task not found");
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

  const createdSubTask = await SubTask.findById(subtask._id)
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res
    .status(201)
    .json(new ApiResponse(201, createdSubTask, "Subtask created successfully"));
});

const updateSubtaskDetails = asyncHandler(async (req, res) => {
  const { projectId, taskId, subTaskId } = req.params;
  const { title, description, assignedTo } = req.body;

  await findProjectScopedSubTask({ projectId, taskId, subTaskId });

  const updateFields = {};

  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;

  if (assignedTo !== undefined) {
    updateFields.assignedTo = assignedTo
      ? new mongoose.Types.ObjectId(assignedTo)
      : null;
  }

  const files = req.files || [];
  if (files.length > 0) {
    updateFields.attachments = buildAttachments(files);
  }

  const updatedSubTask = await SubTask.findByIdAndUpdate(
    subTaskId,
    updateFields,
    {
      new: true,
      runValidators: true,
    },
  )
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedSubTask,
        "Subtask details updated successfully",
      ),
    );
});

const updateSubtaskStatus = asyncHandler(async (req, res) => {
  const { projectId, taskId, subTaskId } = req.params;
  const { status } = req.body;

  await findProjectScopedSubTask({ projectId, taskId, subTaskId });

  if (!AvailableTaskStatus.includes(status)) {
    throw new ApiError(400, "Invalid subtask status");
  }

  const updatedSubTask = await SubTask.findByIdAndUpdate(
    subTaskId,
    {
      status,
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedSubTask,
        "Subtask status updated successfully",
      ),
    );
});

const deleteSubtask = asyncHandler(async (req, res) => {
  const { projectId, taskId, subTaskId } = req.params;

  await findProjectScopedSubTask({ projectId, taskId, subTaskId });

  const subtask = await SubTask.findById(subTaskId)
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  await SubTask.deleteOne({
    _id: subTaskId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, subtask, "Subtask deleted successfully"));
});

const getSubtasksForTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
  });

  if (!task) {
    throw new ApiError(404, "Parent task not found");
  }

  const subtasks = await SubTask.find({
    task: taskId,
  })
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res
    .status(200)
    .json(new ApiResponse(200, subtasks, "Subtasks retrieved successfully"));
});

const getSubtaskById = asyncHandler(async (req, res) => {
  const { projectId, taskId, subTaskId } = req.params;

  const { subtask } = await findProjectScopedSubTask({
    projectId,
    taskId,
    subTaskId,
  });

  const populatedSubtask = await SubTask.findById(subtask._id)
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  return res
    .status(200)
    .json(new ApiResponse(200, populatedSubtask, "Subtask retrieved successfully"));
});



export {
  createSubtask,
  updateSubtaskDetails,
  updateSubtaskStatus,
  deleteSubtask,
  getSubtasksForTask,
  getSubtaskById,
};
