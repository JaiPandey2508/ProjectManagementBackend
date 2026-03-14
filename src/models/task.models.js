import mongoose, { Schema } from "mongoose";
import {AvailableTaskStatuses, TaskStatusEnum} from "../utils/constants.js";


const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
        type: String,
        enum: AvailableTaskStatuses,
        default: TaskStatusEnum.TODO,
    },
    attachments: {//multiple attachments possible for a task, (hence type = Array) -> each with url, mimetype and size.
        type: [{
            url: String,
            mimetype: String,
            size: Number
        }],
        default: []
    }
  },
  { timestamps: true },
);

export const Task = mongoose.model("Task", taskSchema);