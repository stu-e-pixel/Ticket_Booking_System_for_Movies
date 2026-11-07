
const express = require("express");
const router = express.Router();

const BookingController = require("../../controller/Apis/BookingController");

const Validation = require("../../validation/index");

const {
  bookTicketSchema,
  bookingIdSchema,
} = require("../../validation/BookingValidation");

const AuthMiddleware = require("../../middleware/AuthMiddleware");
const roleMiddleware = require("../../middleware/roleMiddleware");





router.post(
  "/createBooking",
  AuthMiddleware.verifyToken,
  roleMiddleware("user"),
  Validation.validate(bookTicketSchema),
  BookingController.bookTickets
);


router.patch(
  "/:id/cancel",
  AuthMiddleware.verifyToken,
  roleMiddleware("user"),
  Validation.validate(bookingIdSchema, "params"),
  BookingController.cancelBooking
);

router.get(
  "/getAllBookings",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  BookingController.getAllBookings
);


router.get(
  "/history",
  AuthMiddleware.verifyToken,
  roleMiddleware("user"),
  BookingController.getBookingHistory
);

module.exports = router;
