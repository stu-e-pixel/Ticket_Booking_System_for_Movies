const Booking = require("../../model/booking");
const BookingService = require("../../service/bookingService");
const logger = require("../../utils/logger");
const statuscode = require("../../utils/statuscode");

class BookingController {
  // BOOK TICKETS
  async bookTickets(req, res) {
    try {
      const { movieId, theaterId, showId, numberOfTickets } = req.body;

      const secretKey = req.headers["x-secret-key"];
      if (!secretKey) {
        return res.status(statuscode.BAD_REQUEST).json({
          status: false,
          message: "Secret key is required",
        });
      }

      if (!req.user || secretKey !== req.user.secretKey) {
        return res.status(statuscode.FORBIDDEN).json({
          status: false,
          message: "Your secret key is not valid",
        });
      }

      const userId = req.user.id;

      const booking = await BookingService.bookTicketsService({
        movieId,
        theaterId,
        showId,
        numberOfTickets,
        userId,
      });

      return res.status(statuscode.CREATED || 201).json({
        status: true,
        message: "Tickets booked successfully",
        data: booking,
      });
    } catch (error) {
      logger.error("Book tickets controller failed", {
        userId: req.user?.userId,
        message: error.message,
        stack: error.stack,
      });

      return res
        .status(error.statusCode || statuscode.SERVER_ERROR || 500)
        .json({
          status: false,
          message: error.message || "Internal server error",
        });
    }
  }

  async getAllBookings(req, res) {
    try {
      const secretKey = req.headers["x-secret-key"];

      if (!secretKey) {
        return res.status(statuscode.BAD_REQUEST).json({
          status: false,
          message: "Secret key is required",
        });
      }

      if (!req.user || secretKey !== req.user.secretKey) {
        return res.status(statuscode.FORBIDDEN).json({
          status: false,
          message: "Your secret key is not valid",
        });
      }

      const page = Math.max(1, Number(req.query.page) || 1);

      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

      logger.info("Get all bookings request started", {
        page,
        limit,
      });

      const bookingData = await BookingService.getAllBookingService({
        page,
        limit,
      });
      logger.info("Get all movies completed successfully", {
        source: bookingData.source,
        totalBookings: bookingData.totalBookings,
      });

      return res.status(statuscode.OK).json({
        status: true,
        ...bookingData,
      });
    } catch (error) {
      logger.error("Get all bookings controller failed", {
        message: error.message,
        stack: error.stack,
      });

      return res.status(error.statusCode || statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  // CANCEL BOOKING
  async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const secretKey = req.headers["x-secret-key"];
      if (!secretKey) {
        return res.status(statuscode.BAD_REQUEST).json({
          status: false,
          message: "Secret key is required",
        });
      }

      if (!req.user || secretKey !== req.user.secretKey) {
        return res.status(statuscode.FORBIDDEN).json({
          status: false,
          message: "Your secret key is not valid",
        });
      }

      const booking = await BookingService.cancelBookingService({
        bookingId: id,
        userId,
      });

      return res.status(statuscode.OK || 200).json({
        status: true,
        message: "Booking cancelled successfully",
        data: booking,
      });
    } catch (error) {
      logger.error("Cancel booking controller failed", {
        bookingId: req.params.id,
        userId: req.user?.userId,
        message: error.message,
        stack: error.stack,
      });

      return res
        .status(error.statusCode || statuscode.SERVER_ERROR || 500)
        .json({
          status: false,
          message: error.message || "Internal server error",
        });
    }
  }

  // USER BOOKING HISTORY
  async getBookingHistory(req, res) {
    try {
      const userId = req.user.id;

      const bookings = await Booking.find({
        userId,
      })
        .populate("movieId", "name genre language poster")
        .populate("theaterId", "theaterName location")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: true,
        message: "Booking history fetched successfully",
        data: bookings,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }
}

module.exports = new BookingController();
