const express = require('express');
const router = express.Router();
const AuthMiddleware = require("../../middleware/AuthMiddleware");
const roleMiddleware = require("../../middleware/roleMiddleware");
const ReportController = require('../../controller/Apis/ReportController')


router.get(
  "/getMovieBookingReport",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  ReportController.getMovieBookingReport
);

router.get(
  "/getTheaterBookingReport",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  ReportController.getTheaterBookingReport
);

router.get(
  "/sendBookingSummary",
  AuthMiddleware.verifyToken,
  ReportController.sendBookingSummary
);


module.exports=router