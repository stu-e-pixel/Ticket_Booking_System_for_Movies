const express = require('express');
const router = express.Router();
const AuthController = require('../../controller/Apis/AuthController');
const Validation = require('../../validation/index');
const UserSchemaValidation = require('../../validation/UserSchemaValidation')
const upload = require('../../utils/mullter');
const AuthMiddleware = require('../../middleware/AuthMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware')


router.post("/createuser",upload.single('image'),Validation.validate(UserSchemaValidation.signup),AuthController.createUSer);
router.post("/verify",AuthController.verify)
router.post("/resendotp",AuthController.resendEmailOTP)
router.post("/login",Validation.validate(UserSchemaValidation.login),AuthController.login)
router.get("/logout",AuthMiddleware.verifyToken,AuthController.logout);
router.get("/refresh-token",AuthController.refreshToken);
router.get("/getprofile",AuthMiddleware.verifyToken,AuthController.userProfile);
router.get("/getAllUsers",AuthMiddleware.verifyToken,roleMiddleware("admin"),AuthController.getAllUsers)
router.post(
  "/reset-password/link",
  Validation.validate(UserSchemaValidation.forgetPassword),
  AuthController.resetPasswordLink,
);

router.post("/resetpassword/:id/:token", AuthController.resetPassword);
router.put("/update/profile/:id",AuthMiddleware.verifyToken,AuthController.updateprofile)
router.post("/updatepassword/:id",AuthMiddleware.verifyToken,AuthController.changePassword)
router.delete("/deleteuser/:id",AuthMiddleware.verifyToken,AuthController.deleteUser)
router.patch("/retrivedeleteduser/:id",AuthMiddleware.verifyToken,AuthController.retriveDeletedUser)
router.delete("/forcedeleteduser/:id",AuthMiddleware.verifyToken,roleMiddleware("admin"),AuthController.forceDeleteUser)
router.post("/updateuserstatus/:id",AuthMiddleware.verifyToken,roleMiddleware("admin"),AuthController.updateUserStatus)



module.exports=router