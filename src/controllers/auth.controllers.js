import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { forgotPasswordMailgenContent, sendEmail } from "../utils/mail.js";
import { emailVerificationMailgenContent } from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const generateAccessAndRefreshTokens = async (userId) => {
  console.log("user id :", userId);
  try {
    const user = await User.findById(userId); //find the user
    console.log("user data :", user);
    const accessToken = user.generateAccessToken();
    console.log("access token generated :", accessToken);
    const refreshToken = user.generateRefreshToken();
    console.log("refresh token generated :", refreshToken);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body; //postman me data hume 'body' se milta hai mainly, iss liye using 'body' here

  const existedUser = await User.findOne({
    //checking if user already exists.
    $or: [{ username }, { email }],// $or => either username matches or email matches.
  });

  if (existedUser) {
    //user exists
    throw new ApiError(409, "User with email or username already exists", []);
  }

  const user = await User.create({
    //user being created because doesn't already exist
    email,
    password,
    username,
    isEmailVerified: false,
  });

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  console.log("before mail sent");

  await sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
    ),
  });

  console.log("after mail sent");
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "User registered successfully and verification email has been sent on your email",
      ),
    );
});

const login = asyncHandler(async (req, res) => {
  console.log("login controller reached");
  const { email, password, username } = req.body; //taking the data

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    //if user doesn't exist
    throw new ApiError(400, "User does not exist");
  }

  //if user exists
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    //password incorrect
    throw new ApiError(400, "Invalid credentials");
  }

  //if password is correct, generate tokens
  console.log("before generating tokens");
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );
  console.log("after generating tokens");

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options) //set the cookie
    .cookie("refreshToken", refreshToken, options) //set the cookie
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    //removing traces in the database and all the cookies that we have
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched succcessfully"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params; //req.params se hume url me jo token aayega wo milega, kyuki humne url me token pass kiya hai email verification ke liye

  if (!verificationToken) {
    //verification token not found
    throw new ApiError(400, "Email verification token is missing");
  }

  //gives you the same hashedToken stored in the database
  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() }, //condition checking if the token is still valid
  });

  if (!user) {
    //if we don't get any user
    throw new ApiError(400, "Token is invalid or expired");
  }

  user.emailVerificationToken = undefined; //ye dono steps optional hain, just doing these so that unnecessary data isn't there
  user.emailVerificationExpiry = undefined;

  //in case the token is not expired
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isEmailVerified: true,
      },
      "Email is verified",
    ),
  );
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id); //user should be logged in

  if (!user) {
    //user doesn't exist
    throw new ApiError(404, "User does not exist");
  }
  if (user.isEmailVerified) {
    //user is already verified
    throw new ApiError(409, "Email is already verified");
  }

  //resend email
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken(); //Generated temporary tokens

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry; //Added them in the database

  await user.save({ validateBeforeSave: false }); //save the things in the database

  console.log("before mail sent"); //personal debugging check ke liye

  await sendEmail({
    //Now sending the email
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Mail has been sent to your email ID"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  //if incomingRefreshToken isn't there
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  //if we have it
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      //if we don't have any user
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      //once token is decoded, it should also be there in the database
      throw new ApiError(401, "Refresh token is expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    //generating the accessToken based on the id
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    //uodating the database
    user.refreshToken = newRefreshToken;

    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body; //we receive an email in the body

  //search the user in the database
  const user = await User.findOne({ email });

  if (!user) {
    //if there is no user
    throw new ApiError(404, "User does not exist", []);
  }

  //user is there
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  //unHashedToken kept in email, other two go to database.

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  //send user an email
  await sendEmail({
    email: user?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset mail has been sent on your mail id",
      ),
    );
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  //get the data
  const { resetToken } = req.params; //params=> getting from the url
  const { newPassword } = req.body;

  let hashedToken = crypto //getting the hashed token from the unhashed token
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    //finding user based on this hashed token
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    //if we don't get the user
    throw new ApiError(489, "Token is invalid or expired");
  }

  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  //checking whether the old password matches
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);//compares oldPassword entered by user with the password in the database, returns true or false

  //if password not valid
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old Password");
  }

  //if password is valid
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordRequest,
  changeCurrentPassword,
  resetForgotPassword,
};
