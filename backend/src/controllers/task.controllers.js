import mongoose from "mongoose";
import { Task } from "../models/task.models.js";
import { SubTask } from "../models/subtask.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { AvailableTaskStatus } from "../utils/constants.js";
import {
  buildAttachments,
  ensureProjectExists,
  ensureProjectMemberUser,
} from "./task.helpers.js";

const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, status } = req.body;
  const { projectId } = req.params;

  await ensureProjectExists(projectId);

  if (assignedTo) {
    await ensureProjectMemberUser(projectId, assignedTo);
  }

  const attachments = buildAttachments(req.files || []);

  const task = new Task({
    title,
    description,
    project: new mongoose.Types.ObjectId(projectId),
    assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : null,
    assignedBy: new mongoose.Types.ObjectId(req.user._id),
    status,
    attachments,
  });

  await task.save();

  const createdTask = await Task.findById(task._id).populate(
    "assignedTo",
    "avatar username fullName",
  );

  return res
    .status(201)
    .json(new ApiResponse(201, createdTask, "Task created successfully"));
});

const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  await ensureProjectExists(projectId);

  const tasks = await Task.find({
    project: new mongoose.Types.ObjectId(projectId),
  }).populate("assignedTo", "avatar username fullName");

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  await ensureProjectExists(projectId);

  const task = await Task.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedTo",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "subtasks",
        localField: "_id",
        foreignField: "task",
        as: "subtasks",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "assignedTo",
              foreignField: "_id",
              as: "assignedTo",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "assignedBy",
              foreignField: "_id",
              as: "assignedBy",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              assignedTo: {
                $arrayElemAt: ["$assignedTo", 0],
              },
              assignedBy: {
                $arrayElemAt: ["$assignedBy", 0],
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        assignedTo: {
          $arrayElemAt: ["$assignedTo", 0],
        },
      },
    },
  ]);

  if (!task || task.length === 0) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task[0], "Task fetched successfully"));
});

const updateTaskDetails = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description, assignedTo } = req.body;

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

  const task = await Task.findOneAndUpdate(
    {
      _id: taskId,
      project: projectId,
    },
    updateFields,
    {
      new: true,
      runValidators: true,
    },
  ).populate("assignedTo", "avatar username fullName");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { status } = req.body;

  await ensureProjectExists(projectId);

  if (!AvailableTaskStatus.includes(status)) {
    throw new ApiError(400, "Invalid task status");
  }

  const task = await Task.findOneAndUpdate(
    {
      _id: taskId,
      project: projectId,
    },
    {
      status,
    },
    {
      new: true,
      runValidators: true,
    },
  ).populate("assignedTo", "avatar username fullName");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task status updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
  }).populate("assignedTo", "avatar username fullName");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  await SubTask.deleteMany({
    task: task._id,
  });

  await Task.deleteOne({
    _id: task._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task deleted successfully"));
});

export {
  createTask,
  getTasks,
  getTaskById,
  updateTaskDetails,
  updateTaskStatus,
  deleteTask,
};
