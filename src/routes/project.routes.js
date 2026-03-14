import { Router } from "express";
import {
  addMembersToProject,
  createProject,
  deleteMember,
  getProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  deleteProject,
  updateMemberRole,
} from "../controllers/project.controllers.js"; //bringing in the controllers
import { validate } from "../middlewares/validator.middleware.js";
import {createProjectValidator, addMemberToProjectValidator} from "../validators/index.js";
import {verifyJWT, validateProjectPermission} from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";


const router = Router();
router.use(verifyJWT);//all routes after this will require authentication, hence include verifyJWT as a middleware

//all routes from here will contain the verifyJWT middelware, so we can be sure that the user is authenticated
router
    .route("/")
    .get(getProjects)
    .post(createProjectValidator(), validate, createProject)

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailableUserRole), getProjectById)//everyone is allowed to get project details, so we pass AvailableUserRole which has all the roles in the array
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN]),//only admin can update project details, so we pass only admin role in the array
    createProjectValidator(),
    validate,
    updateProject
  )
  .delete(
    validateProjectPermission([UserRolesEnum.ADMIN]),//only admin can delete the project, so we pass only admin role in the array
    deleteProject
  )

router
  .route("/:projectId/members")// ':' ki wajah se it takes projectId as params (parameters) in the url
  .get(getProjectMembers)
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN]),//only admin can add members to the project
    addMemberToProjectValidator(),
    validate,
    addMembersToProject
  )

router
  .route("/:projectId/members/:userId") // ':' ki wajah se it takes projectId and userId as params (parameters) in the url
  .put(validateProjectPermission([UserRolesEnum.ADMIN]), updateMemberRole)
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteMember)



export default router;