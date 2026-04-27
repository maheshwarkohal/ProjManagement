import mongoose, { Schema } from "mongoose";
import { AvailableProjectStatus, ProjectStatusEnum } from "../utils/constants.js";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: AvailableProjectStatus,
      default: ProjectStatusEnum.PLANNING,
    },
    coverImage: {
      type: {
        url: String,
        localPath: String,
      },
      default: {
        url: "",
        localPath: "",
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId, // means it will refer to another document and that document is user
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Project = mongoose.model("Project", projectSchema);
