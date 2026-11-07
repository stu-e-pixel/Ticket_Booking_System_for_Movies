const joi = require("joi");

class UserSchemaValidation {
  static signup = joi.object({
    name: joi.string().trim().required().messages({
      "string.required": "Name is required",
      "any.required": "Name is required",
    }),
    email: joi.string().required().email().trim().messages({
      "string.email": "place inter a valid email address",
      "string.required": "Email is required",
      "any.required": "Email is required",
    }),
    phone: joi
      .string()
      .trim()
      .required()
      .pattern(/^[6-9]\d{9}$/)
      .messages({
        "string.pattern.case": "place inter a valid 10 digit number",
        "string.required": "Phone number is required",
        "any.required": "Phone nimber is required",
      }),
    password: joi.string().min(6).max(15).trim().required().messages({
      "string.min": "place enter upto 6 number",
      "string.max": "upload only 15 number  password",
      "string.required": "password is required",
      "any.required": "password is required",
    }),
  });

  static login = joi.object({
    email: joi.string().email().trim().required().messages({
      "string.required": "Email is required",
      "any.required": "Email is required",
    }),
    password: joi.string().trim().required().messages({
      "string.required": "password is required",
      "any.required": "password is required",
    }),
  });

  static forgetPassword = joi.object({
    email: joi.string().email().required().trim().messages({
      "string.email": "place provide a valid email",
      "string.required": "Email is required",
      "any.required": "Email is required",
    }),
  });
}

module.exports = UserSchemaValidation;
