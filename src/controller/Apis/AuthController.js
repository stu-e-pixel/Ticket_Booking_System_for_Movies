const User = require("../../model/user.model");
const cloudinary = require("../../config/cloudinary.config");
const statuscode = require("../../utils/statuscode");
const bcryptjs = require("bcryptjs");
const sendEmailOtp = require("../../utils/sendEmailOtp");
const logger = require("../../utils/logger");
const AuthService = require("../../service/authService");
const OtpModel = require("../../model/otp");
const transporter = require("../../config/email.config");
const {
  genarateRefreshToken,
  genarateAccessToken,
} = require("../../utils/genarateToken");
const jwt = require("jsonwebtoken");
const {
  getUserCache,
  setUserCache,
  deleteUserCache,
} = require("../../service/UserCache");
class AuthController {
  async createUSer(req, res) {
    try {
      const { name, email, phone, password } = req.body;

      logger.info("User registration attempt started", { email });

      const userdata = await AuthService.registerservice({
        name,
        email,
        phone,
        password,
        file: req.file,
      });

      logger.info("User created successfully", {
        userId: userdata._id,
        email: userdata.email,
      });

      await sendEmailOtp(req, userdata);

      logger.info("Registration OTP sent successfully", {
        userId: userdata._id,
        email: userdata.email,
      });

      return res.status(statuscode.OK).json({
        status: true,
        message: "User created succesfully check your email for verify email",
        data: userdata,
      });
    } catch (error) {
      logger.error("User registration failed", {
        message: error.message,
        stack: error.stack,
        email: req.body?.email,
      });

      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async verify(req, res) {
    try {
      const { email, otp } = req.body;

      const existingUser = await User.findOne({ email });

      if (!existingUser) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "user not found",
        });
      }

      if (existingUser.is_Verified) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "user already verified",
        });
      }

      const emailVerification = await OtpModel.findOne({
        userId: existingUser.id,
        otp,
      });

      if (!emailVerification) {
        if (!existingUser.is_Verified) {
          await sendEmailOtp(req, existingUser);
          return res.status(statuscode.NOT_FOUND).json({
            status: false,
            message: "Otp is expire send new otp in your email",
          });
        }
      }

      const currentTime = Date.now();
      const expireTime =
        new Date(emailVerification.createdAt).getTime() + 15 * 60 * 1000;
      if (currentTime > expireTime) {
        await sendEmailOtp(req, existingUser);
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Otp is expire send new otp in your email",
        });
      }

      existingUser.is_Verified = true;
      await existingUser.save();
      await OtpModel.deleteMany({
        userId: existingUser.id,
      });

      await deleteUserCache();

      return res.status(200).json({
        status: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      logger.error("User registration failed", {
        message: error.message,
        stack: error.stack,
        email: req.body?.email,
      });

      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async resendEmailOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const user = await User.findOne({
        email: normalizedEmail,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.is_Verified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      const data = await user.save();

      await sendEmailOtp(req, data);

      return res.status(200).json({
        success: true,
        message: "New OTP sent successfully",
        data: {
          email: data.email,
          role: data.role,
        },
      });
    } catch (error) {
      console.error("RESEND OTP ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP",
        error: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      logger.info("Login request received", {
        email,
        ip: req.ip,
      });

      const result = await AuthService.loginService({
        email,
        password,
      });

      logger.info("Login service completed successfully", {
        userId: result.user._id,
        email: result.user.email,
      });

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      logger.info("Refresh token cookie set successfully", {
        userId: result.user._id,
        email: result.user.email,
      });

      logger.info("Login response sent successfully", {
        userId: result.user._id,
        email: result.user.email,
      });

      return res.status(statuscode.OK).json({
        status: true,
        message: "Login User successfully",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        secretKey: result.secretKey,
        user: {
          _id: result.user._id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
      });
    } catch (error) {
      logger.error("Login controller failed", {
        message: error.message,
        stack: error.stack,
        email: req.body?.email,
        ip: req.ip,
      });

      return res.status(error.statusCode || statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async logout(req, res) {
    try {
      const userId = req.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const secretKey = req.headers["x-secret-key"];

      if (!secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }

      if (secretKey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Your Secret key is not valid",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      user.secretKey = null;



      await user.save();

      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error("LOGOUT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Logout failed",
        error: error.message,
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const token = req.cookies.refreshToken;
      if (!token) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Invalid token",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      console.log("decoded", decoded);

      const user = await User.findById(decoded.userId);
      console.log("user found", user);

      if (!user) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "User not defined",
        });
      }

      const newRefreshToken = genarateRefreshToken(user);
      const newAccessToken = genarateAccessToken(user);

      user.refreshToken = newRefreshToken;

      await user.save();

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        status: true,
        acessToken: newAccessToken,
      });
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async userProfile(req, res) {
    try {
      const secretKey = req.headers["x-secret-key"];

      if (!secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }

      if (secretKey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Your Secrret key is not valid",
        });
      }

      return res.status(statuscode.OK).json({
        status: true,
        message: "This is user profile",
        user: req.user,
      });
    } catch (error) {
      logger.error("Login controller failed", {
        message: error.message,
        stack: error.stack,
        email: req.body?.email,
        ip: req.ip,
      });

      return res.status(error.statusCode || statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async getAllUsers(req, res) {
    try {
      const { name, email } = req.query;

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 5));

      const skip = (page - 1) * limit;

      const query = {
        is_Deleted: false,
        role: "user",
      };

      if (name) {
        query.name = { $regex: name, $options: "i" };
      }

      if (email) {
        query.email = { $regex: email, $options: "i" };
      }

      const cacheKey = `User:list:${JSON.stringify({
        name,
        email,
        page,
        limit,
      })}`;

      const cachedData = await getUserCache(cacheKey);

      if (cachedData) {
        return res.status(200).json({
          status: true,
          source: "redis",
          ...cachedData,
        });
      }

      const secretKey = req.headers["x-secret-key"];

      if (!secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }

      if (secretKey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Your Secrret key is not valid",
        });
      }

      const [userData, totalUsers] = await Promise.all([
        User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

        User.countDocuments(query),
      ]);

      const responseData = {
        count: userData.length,
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        data: userData,
      };
      await setUserCache(cacheKey, responseData, 300);

      return res.status(statuscode.OK).json({
        status: true,
        source: "mongodb",
        ...responseData,
      });
    } catch (error) {
      logger.error("Get all users failed", {
        message: error.message,
        stack: error.stack,
      });

      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async resetPasswordLink(req, res) {
    try {
      const { email } = req.body;

      console.log(" Email received:", email);

      if (!email) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Please provide a valid email address",
        });
      }

      const secretKey = req.headers["x-secret-key"];

      if (!secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }

      if (secretKey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Your Secrret key is not valid",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "User is not found",
        });
      }

      const secret = user._id + process.env.JWT_SECRET_KEY;

      const tokenlink = jwt.sign({ userId: user._id }, secret, {
        expiresIn: "20m",
      });

      console.log("TOKEN:", tokenlink);

      const resetLink = `${process.env.FRONTEND_HOST}/reset-password/${user._id}/${tokenlink}`;

      console.log("RESET LINK:", resetLink);

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Password Reset Link",
        html: `
        <div>
          <h2>Password Reset</h2>

          <p>Hello ${user.name},</p>

          <p>
            You requested to reset your password.
          </p>

          <p>
            Click the button below to reset your password:
          </p>

          <a
            href="${resetLink}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#1976d2;
              color:white;
              text-decoration:none;
              border-radius:5px;
            "
          >
            Reset Password
          </a>

          <p>
            This link will expire in 20 minutes.
          </p>
        </div>
      `,
      });

      console.log("✅ EMAIL SENT");
      console.log("Message ID:", info.messageId);
      console.log("Response:", info.response);

      return res.status(200).json({
        status: true,
        message: "Password reset email sent. Please check your email.",
      });
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { password, comformpassword } = req.body;
      const { id, token } = req.params;

      const secretKey = req.headers["x-secret-key"];

      if (!secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }

      if (secretKey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Your Secrret key is not valid",
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "place provide a valid user",
        });
      }

      if (!password || !comformpassword) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "place provide password and comformpassword",
        });
      }

      if (password !== comformpassword) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "your password and conform password is not match",
        });
      }

      const salt = await bcryptjs.genSalt(10);
      const newHashPassword = await bcryptjs.hash(password, salt);

      const data = await User.findByIdAndUpdate(user._id, {
        $set: { password: newHashPassword },
      });

      await deleteUserCache();

      if (!data) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "password is not updated",
        });
      } else {
        return res.status(statuscode.OK).json({
          status: true,
          message: "password updated succefully",
          data: data,
        });
      }
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateprofile(req, res) {
    try {
      const { id } = req.params;
      const { name, phone } = req.body;
      const profiledatabyid = await User.findById(id);

      const secretKey = req.headers["x-secret-key"];

      if (!secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }

      if (secretKey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Your Secrret key is not valid",
        });
      }

      let image = profiledatabyid.image;
      let public_id = profiledatabyid.public_id;

      if (req.file) {
        if (profiledatabyid.public_id) {
          await cloudinary.uploader.destroy(profiledatabyid.public_id);
        }

        image = req.file.path;
        public_id = req.file.filename;
      }

      const profiledata = await User.findByIdAndUpdate(
        {
          _id: req.user.id,
          isDeleted: false,
        },
        { name, phone, image },
        { new: true },
      );

      await deleteUserCache();

      if (!profiledata && profiledata.length === 0) {
        return res.status(statuscode.NOT_FOUND).json({
          success: false,
          message: "no product available",
        });
      } else {
        return res.status(statuscode.OK).json({
          success: true,
          data: profiledata,
        });
      }
    } catch (error) {
      return res.status(statuscode.NOT_FOUND).json({
        success: false,
        message: error.message,
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const { id } = req.params;

      const secretKey = req.headers["x-secret-key"];

      if (!secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }

      if (secretKey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Your Secrret key is not valid",
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }

      const user = await User.findById(id).select("+password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isCorrect = await bcryptjs.compare(currentPassword, user.password);

      if (!isCorrect) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password must be different from current password",
        });
      }

      user.password = await bcryptjs.hash(newPassword, 10);

      user.secretKey = undefined;

      await user.save();

      await deleteUserCache();

      return res.status(200).json({
        success: true,
        message: "Password changed successfully. Please login again.",
        data: {
          userId: user._id,
        },
      });
    } catch (error) {
      console.error("CHANGE PASSWORD ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to change password",
        error: error.message,
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const userdata = await User.findByIdAndUpdate(
        id,
        { is_Deleted: true },
        { new: true },
      );

      const secretkey = req.headers["x-secret-key"];
      if (!secretkey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }
      if (secretkey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "place provide vali secretkey",
        });
      }

      await deleteUserCache();

      if (!userdata) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "User is not deleted succefully",
        });
      } else {
        return res.status(statuscode.OK).json({
          status: true,
          message: "User deleted succefully",
        });
      }
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  async retriveDeletedUser(req, res) {
    try {
      const { id } = req.params;
      const userdata = await User.findByIdAndUpdate(
        id,
        { is_Deleted: false },
        { new: true },
      );

      const secretkey = req.headers["x-secret-key"];
      if (!secretkey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }
      if (secretkey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "place provide valid secretkey",
        });
      }

      await deleteUserCache();

      if (!userdata) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "User is not retrive",
        });
      } else {
        return res.status(statuscode.OK).json({
          status: true,
          message: "User retrive succefully",
        });
      }
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  async forceDeleteUser(req, res) {
  try {
    const { id } = req.params;
    const secretkey = req.headers["x-secret-key"];

    if (!secretkey) {
      return res.status(statuscode.BAD_REQUEST).json({
        status: false,
        message: "Secret key is required",
      });
    }

    if (secretkey !== req.user.secretKey) {
      return res.status(statuscode.UNAUTHORIZED).json({
        status: false,
        message: "Please provide a valid secret key",
      });
    }
    const userdata = await User.findByIdAndDelete(id);

    if (!userdata) {
      return res.status(statuscode.NOT_FOUND).json({
        status: false,
        message: "User not found",
      });
    }
    try {
      await deleteUserCache();
    } catch (cacheError) {
      console.error("Cache deletion failed:", cacheError);
    }

    // Cloudinary cleanup
    if (userdata.public_id) {
      try {
        await cloudinary.uploader.destroy(userdata.public_id);
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion failed:", cloudinaryError);
      }
    }

    return res.status(statuscode.OK).json({
      status: true,
      message: "User deleted succefully",
    });

  } catch (error) {
    console.error("Force Delete Controller Error:", error);

    return res.status(statuscode.SERVER_ERROR).json({
      status: false,
      message: error.message,
    });
  }
}

  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["active", "inactive"].includes(status)) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "place provide valid status",
        });
      }

      const secretkey = req.headers["x-secret-key"];
      if (!secretkey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "secretkey is required",
        });
      }
      if (secretkey !== req.user.secretKey) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "place provide vali secretkey",
        });
      }

      const userdata = await User.findByIdAndUpdate(
        { _id: id, is_Deleted: false },
        { status },
        { new: true },
      ).select("-password");

      await deleteUserCache();

      if (!userdata) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "user is not defind",
        });
      } else {
        return res.status(statuscode.OK).json({
          status: true,
          message: `User ${status} successfully`,
          user: userdata,
        });
      }
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
        stack: error.stack,
      });
    }
  }
}
module.exports = new AuthController();
