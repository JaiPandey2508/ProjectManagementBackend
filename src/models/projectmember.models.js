import mongoose, { Schema } from "mongoose";
import {AvailableUserRole, UserRolesEnum} from "../utils/constants.js";

const projectMemberSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",//points to a specific user
        required: true,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: "Project",//points to a specific project
        required: true,
    },
    role: {
        type: String,
        enum: AvailableUserRole,
        default: UserRolesEnum.MEMBER,//by default you become just the member here.
    }
}, {timestamps: true})

export const ProjectMember = mongoose.model("ProjectMember", projectMemberSchema);