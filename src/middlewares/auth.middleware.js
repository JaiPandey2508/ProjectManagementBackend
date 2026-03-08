import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(
  async (req, res, next) => {
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
  },
);
