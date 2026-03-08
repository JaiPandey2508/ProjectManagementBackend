import { Router } from "express";
import { changeCurrentPassword, forgotPasswordRequest, getCurrentUser, login, logoutUser, refreshAccessToken, registerUser, resendEmailVerification, resetForgotPassword, verifyEmail } from "../controllers/auth.controllers.js"; //bringing in the controller
import { validate } from "../middlewares/validator.middleware.js";
import {userChangeCurrentPasswordValidator, userForgotPasswordValidator, userRegisterValidator, userResetForgotPasswordValidator} from "../validators/index.js";
import { userLoginValidator } from "../validators/index.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";


const router = Router();

//defining how we use this controller
//unsecured routes  (will not require login)
router.route("/register").post(userRegisterValidator(), validate, registerUser);//here 'validate' is as a middleware, and userRegisterValidator executes.
router.route("/login").post(userLoginValidator(), validate, login);//here 'validate' is as a middleware, and userLoginValidator executes.
router.route("/verify-email/:verificationToken").get(verifyEmail);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(userForgotPasswordValidator(), validate, forgotPasswordRequest);
router.route("/reset-password/:resetToken").post(userResetForgotPasswordValidator(), validate, resetForgotPassword);

//secure routes (will require a token)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").post(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, userChangeCurrentPasswordValidator(), validate, changeCurrentPassword);
router.route("/resend-email-verification").post(verifyJWT, resendEmailVerification);//verifyJWT makes sure user is logged in  

export default router;
