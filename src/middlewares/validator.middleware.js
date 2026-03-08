import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

export const validate = (req, res, next) => {
  console.log("validate middleware reached");
  const errors = validationResult(req);//extracting the errors
  if (errors.isEmpty()) {//if errors is empty then we can move to next
    return next();
  }
  const extractedErrors = [];//if errors isn't empty, we extract it and throw it
  errors.array().map((err) => extractedErrors.push(
    { 
        [err.path]: err.msg 
    }));
    throw new ApiError(422, "Received data is not valid", extractedErrors);
};
