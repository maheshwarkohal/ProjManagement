import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { SubTask } from "../models/subtask.models.js";
import { Conversation } from "../models/conversation.models.js";
import { Message } from "../models/message.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import mongoose from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "projects",
        pipeline: [
          {
            $lookup: {
              from: "projectmembers",
              localField: "_id",
              foreignField: "project",
              as: "projectmembers",
            },
          },
          {
            $addFields: {
              members: {
                $size: "$projectmembers",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$projects",
    },
    {
      $project: {
        _id: "$projects._id",
        name: "$projects.name",
        description: "$projects.description",
        members: "$projects.members",
        createdBy: "$projects.createdBy",
        createdAt: "$projects.createdAt",
        updatedAt: "$projects.updatedAt",
        role: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project fetched successfully"));
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const existingProject = await Project.findOne({ name });

  if (existingProject) {
    throw new ApiError(400, "Project with the same name already exists");
  }

  const project = await Project.create({
    name,
    description,
    createdBy: new mongoose.Types.ObjectId(req.user._id), // it will convert the string id to mongoose object id
  });

  await ProjectMember.create({
    user: new mongoose.Types.ObjectId(req.user._id),
    project: new mongoose.Types.ObjectId(project._id),
    role: UserRolesEnum.ADMIN,
  });

  await Conversation.create({
    type: "project",
    project: new mongoose.Types.ObjectId(project._id),
    createdBy: new mongoose.Types.ObjectId(req.user._id),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { projectId } = req.params;

  const project = await Project.findByIdAndUpdate(
    projectId,
    { name, description },
    { new: true, runValidators: true },
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const session = await mongoose.startSession();
  let deletedProject;

  try {
    await session.withTransaction(async () => {
      const project = await Project.findById(projectId).session(session);

      if (!project) {
        throw new ApiError(404, "Project not found");
      }

      const projectTasks = await Task.find(
        { project: new mongoose.Types.ObjectId(projectId) },
        { _id: 1 },
      ).session(session);

      const taskIds = projectTasks.map((task) => task._id);

      if (taskIds.length > 0) {
        await SubTask.deleteMany({
          task: { $in: taskIds },
        }).session(session);
      }

      const projectConversations = await Conversation.find(
        {
          type: "project",
          project: new mongoose.Types.ObjectId(projectId),
        },
        { _id: 1 },
      ).session(session);

      const conversationIds = projectConversations.map(
        (conversation) => conversation._id,
      );

      await Task.deleteMany({
        project: new mongoose.Types.ObjectId(projectId),
      }).session(session);

      if (conversationIds.length > 0) {
        await Message.deleteMany({
          conversation: { $in: conversationIds },
        }).session(session);
      }

      await Conversation.deleteMany({
        type: "project",
        project: new mongoose.Types.ObjectId(projectId),
      }).session(session);

      await ProjectMember.deleteMany({
        project: new mongoose.Types.ObjectId(projectId),
      }).session(session);

      await Project.deleteOne({ _id: projectId }).session(session);

      deletedProject = project;
    });
  } finally {
    await session.endSession();
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      deletedProject,
      "Project and all associated data deleted successfully",
    ),
  );
});

const addMembersToProject = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const projectMember = await ProjectMember.findOneAndUpdate(
    {
      user: new mongoose.Types.ObjectId(user._id),
      project: new mongoose.Types.ObjectId(projectId),
    },
    {
      user: new mongoose.Types.ObjectId(user._id),
      project: new mongoose.Types.ObjectId(projectId),
      role: role,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Member added to project successfully",
      ),
    );
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectMembers = await ProjectMember.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
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
        user: {
          $arrayElemAt: ["$user", 0],
        },
      },
    },
    {
      $project: {
        project: 1,
        user: 1,
        role: 1,
        createdAt: 1,
        updatedAt: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMembers,
        "Project members fetched successfully",
      ),
    );
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { newRole } = req.body;

  if (!AvailableUserRole.includes(newRole)) {
    throw new ApiError(400, "Invalid role");
  }

  let projectMember = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!projectMember) {
    throw new ApiError(404, "Project member not found");
  }

  const updatedProjectMember = await ProjectMember.findByIdAndUpdate(
    projectMember._id,
    {
      role: newRole,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedProjectMember) {
    throw new ApiError(400, "Failed to update member role");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedProjectMember,
        "Member role updated successfully",
      ),
    );
});

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  // const userIsAdmin = await ProjectMember.findOne({
  //   project: new mongoose.Types.ObjectId(projectId),
  //   user: new mongoose.Types.ObjectId(req.user._id),
  //   role: UserRolesEnum.ADMIN,
  // });
  
  const projectMember = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!projectMember) {
    throw new ApiError(404, "Project member not found");
  }

  const deletedProjectMember = await ProjectMember.findByIdAndDelete(
    projectMember._id,
  );

  if (!deletedProjectMember) {
    throw new ApiError(400, "Failed to delete member from project");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "Member deleted from project successfully"),
    );
});

export {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addMembersToProject,
  getProjectMembers,
  updateMemberRole,
  deleteMember,
};
