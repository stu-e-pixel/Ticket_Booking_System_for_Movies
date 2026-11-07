const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const LoginSecretKey = () => {
  return crypto.randomBytes(64).toString("hex");
};

const genarateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      type: "access",
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "1d",
    },
  );
};

const genarateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

module.exports = { LoginSecretKey, genarateAccessToken, genarateRefreshToken };
