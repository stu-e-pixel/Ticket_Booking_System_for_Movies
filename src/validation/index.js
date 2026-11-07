
const statuscode = require("../utils/statuscode");

class Validation {
  static validate(Schema, property = "body") {
    return (req, res, next) => {
      const { error, value } = Schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        return res.status(statuscode.BAD_REQUEST).json({
          status: false,
          errors: error.details.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      req[property] = value;
      next();
    };
  }
}

module.exports = Validation;
