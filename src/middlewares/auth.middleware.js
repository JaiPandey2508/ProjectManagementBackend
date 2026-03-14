import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", ""); //extracting access token from cookies

  if (!token) {
    //if we don't have any token
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    //if we do have token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
    );

    if (!user) {
      //if we don't have a user
      throw new ApiError(401, "Invalid access token");
    }
    req.user = user;
    next(); //hop on to the next middleware or continue with the controller itself
  } catch (error) {
    throw new ApiError(401, "Invalid access token");
  }
});

export const validateProjectPermission = (roles = []) => {
  asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(400, "Project id is missing");
    }

    const project = await ProjectMember.findOne({
      //not really a project, just calling it so for easier reference
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(req.user._id),
    });

    if (!project) {
      throw new ApiError(400, "Project not found");
    }

    const givenRole = project?.role; //the role that you have right now, taken from the database

    req.user.role = givenRole;

    if (!roles.includes(givenRole)) {
      //checking if givenRole is included in the 'roles' array in the first line of this function
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }

    next();
  });
};
