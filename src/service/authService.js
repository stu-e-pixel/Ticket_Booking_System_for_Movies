const User = require("../model/user.model");
const cloudinary = require("../config/cloudinary.config");
const bcryptjs = require("bcryptjs");
const logger = require("../utils/logger");
const {
  genarateAccessToken,
  genarateRefreshToken,
  LoginSecretKey,
} = require("../utils/genarateToken");
const { deleteUserCache } = require("./UserCache");

const registerservice = async ({ name, email, phone, password, file }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    logger.warn("User registration failed: Email already exists", {
      email,
    });

    if (file) {
      await cloudinary.uploader.destroy(file.filename);
    }

    const error = new Error("User already exists");
    error.statusCode = 409;
    throw error;
  }

  const salt = 10;
  const hashedpassword = await bcryptjs.hash(password, salt);

  const createUser = new User({
    name: name,
    email: email,
    phone: phone,
    password: hashedpassword,
    role: "user",
    status:"active"
  });

  if (file) {
    createUser.image = file.path;
    createUser.public_id = file.filename;
  }

  const userdata = await createUser.save();
  await deleteUserCache()

  return userdata;
};


const loginService = async ({ email, password }) => {
  try {
    logger.info("User login attempt started", {
      email,
    });

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("Login failed: User not found", {
        email,
      });

      throw new Error("Invalid email or password");
    }

    logger.info("User found, checking password", {
      userId: user._id,
      email: user.email,
    });

    const isPassword = await user.comparePassword(password);

    if (!isPassword) {
      logger.warn("Login failed: Invalid password", {
        userId: user._id,
        email: user.email,
      });

      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      logger.warn("Login failed: User account is inactive", {
        userId: user._id,
        email: user.email,
      });

      throw new Error("Inactive user");
    }

    logger.info("Password verified successfully", {
      userId: user._id,
      email: user.email,
    });

    const accessToken = genarateAccessToken(user);
    const refreshToken = genarateRefreshToken(user);
    const secretKey = LoginSecretKey();

    user.refreshToken = refreshToken;
    user.secretKey=secretKey;

    await user.save();

    logger.info("User login successful", {
      userId: user._id,
      email: user.email,
    });

    return {
      user,
      accessToken,
      refreshToken,
      secretKey,
    };

  } catch (error) {
    logger.error("Login service failed", {
      message: error.message,
      stack: error.stack,
      email,
    });

    throw error;
  }
};

module.exports = { registerservice, loginService };
