const statuscode = require("../utils/statuscode");
const jwt = require("jsonwebtoken");
const User = require("../model/user.model");
class AuthMiddleware {
  static async verifyToken(req, res, next) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Token is not defined",
        });
      } 

      const cleanToken = token.split(" ")[1];
      const decoded = jwt.verify(cleanToken, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "user not found",
        });
      }

      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        secretKey:user.secretKey
      };
      next();
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }
}

module.exports = AuthMiddleware;
