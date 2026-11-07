
const ReportService = require("../../service/reportService")
const logger = require('../../utils/logger');
const statuscode = require('../../utils/statuscode');


class ReportController {

  
  async getMovieBookingReport(req, res) {
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

    
    const { movieName, genre, language } = req.query;

   
    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    logger.info("Get movie booking report request started", {
      movieName,
      genre,
      language,
      page,
      limit,
    });

    const report = await ReportService.getMovieBookingReportService({
      movieName,
      genre,
      language,
      page,
      limit,
    });

    logger.info("Movie booking report completed successfully", {
      source: report.source,
      totalMovies: report.totalMovies,
    });

    return res.status(statuscode.OK).json({
      status: true,
      message: "Movie booking report generated successfully",
      ...report,
    });

  } catch (error) {
    logger.error("Get movie booking report controller failed", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(
      error.statusCode || statuscode.SERVER_ERROR
    ).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }

  }


  // THEATER WISE BOOKING REPORT
  async getTheaterBookingReport(req, res) {
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

   
    const {
      theaterName,
      location,
      movieName,
    } = req.query;

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    logger.info("Get theater booking report request started", {
      theaterName,
      location,
      movieName,
      page,
      limit,
    });

    const report =
      await ReportService.getTheaterBookingReportService({
        theaterName,
        location,
        movieName,
        page,
        limit,
      });

    logger.info("Theater booking report completed successfully", {
      source: report.source,
      totalTheaters: report.totalTheaters,
    });

    return res.status(statuscode.OK).json({
      status: true,
      message: "Theater booking report generated successfully",
      ...report,
    });

  } catch (error) {
    logger.error("Get theater booking report controller failed", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(
      error.statusCode || statuscode.SERVER_ERROR
    ).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
  }


  
  async sendBookingSummary(req, res) {
   try {
    const userId = req.user.id;
    const userEmail = req.user.email;

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

    logger.info("Send booking summary request received", {
      userId,
      email: userEmail,
    });

    
    if (!userId || !userEmail) {
      return res.status(statuscode.BAD_REQUEST).json({
        status: false,
        message: "User ID or email is missing",
      });
    }

    const result = await ReportService.sendBookingSummaryService({
      userId,
      userEmail,
    });

    
    if (!result) {
      return res.status(statuscode.NOT_FOUND).json({
        status: false,
        message: "No booking history found",
      });
    }

    logger.info("Booking summary sent successfully", {
      userId,
      email: userEmail,
    });

    return res.status(statuscode.OK).json({
      status: true,
      message: "Booking summary sent to your email successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Send booking summary controller failed", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(
      error.statusCode || statuscode.SERVER_ERROR
    ).json({
      status: false,
      message: error.message || "Failed to send booking summary",
    });
  }
  }
}

module.exports = new ReportController();
