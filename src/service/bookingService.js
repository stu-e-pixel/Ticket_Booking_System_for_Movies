const mongoose = require("mongoose");
const crypto = require("crypto");

const Theater = require("../model/theater");
const Movie = require("../model/movie");
const Booking = require("../model/booking");
const logger = require("../utils/logger");

const {
  deleteBookingCache,
  getBookingCache,
  setBookingCache,
} = require("../service/BookingCache");

const bookTicketsService = async ({
  movieId,
  theaterId,
  showId,
  numberOfTickets,
  userId,
}) => {
  const session = await mongoose.startSession();

  try {
    if (
      !mongoose.Types.ObjectId.isValid(movieId) ||
      !mongoose.Types.ObjectId.isValid(theaterId) ||
      !mongoose.Types.ObjectId.isValid(showId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      const error = new Error("Invalid movie, theater, show, or user ID");
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isInteger(numberOfTickets) || numberOfTickets <= 0) {
      const error = new Error("Number of tickets must be a positive integer");
      error.statusCode = 400;
      throw error;
    }

    const movieObjectId = new mongoose.Types.ObjectId(movieId);
    const theaterObjectId = new mongoose.Types.ObjectId(theaterId);
    const showObjectId = new mongoose.Types.ObjectId(showId);

    const now = new Date();

    session.startTransaction();

    const theater = await Theater.findOne({
      _id: theaterObjectId,
      isDeleted: false,
      screens: {
        $elemMatch: {
          shows: {
            $elemMatch: {
              _id: showObjectId,
              movieId: movieObjectId,
              status: "active",
              isDeleted: { $ne: true },
              showDate: { $gte: now },
            },
          },
        },
      },
    }).session(session);

    if (!theater) {
      const error = new Error("Theater or active show not found");
      error.statusCode = 404;
      throw error;
    }

    const screen = theater.screens.find((screenItem) =>
      screenItem.shows.some(
        (showItem) =>
          showItem._id.toString() === showId &&
          showItem.movieId.toString() === movieId &&
          showItem.status === "active" &&
          showItem.isDeleted !== true,
      ),
    );

    if (!screen) {
      const error = new Error("Screen not found");
      error.statusCode = 404;
      throw error;
    }

    const show = screen.shows.find(
      (showItem) => showItem._id.toString() === showId,
    );

    if (!show) {
      const error = new Error("Show not found");
      error.statusCode = 404;
      throw error;
    }

    if (show.availableSeats < numberOfTickets) {
      const error = new Error("Not enough seats available");
      error.statusCode = 400;
      throw error;
    }
    const movie = await Movie.findOne({
      _id: movieObjectId,
      isDeleted: false,
    }).session(session);

    if (!movie) {
      const error = new Error("Movie not found");
      error.statusCode = 404;
      throw error;
    }
    const seatUpdate = await Theater.updateOne(
      {
        _id: theaterObjectId,
        isDeleted: false,
        screens: {
          $elemMatch: {
            shows: {
              $elemMatch: {
                _id: showObjectId,
                movieId: movieObjectId,
                status: "active",
                isDeleted: { $ne: true },
                showDate: { $gte: now },
              },
            },
          },
        },
      },
      {
        $inc: {
          "screens.$[].shows.$[selectedShow].availableSeats": -numberOfTickets,
        },
      },
      {
        arrayFilters: [
          {
            "selectedShow._id": showObjectId,
            "selectedShow.movieId": movieObjectId,
            "selectedShow.status": "active",
            "selectedShow.isDeleted": { $ne: true },
            "selectedShow.availableSeats": {
              $gte: numberOfTickets,
            },
            "selectedShow.showDate": { $gte: now },
          },
        ],
        session,
      },
    );

    if (seatUpdate.modifiedCount !== 1) {
      const error = new Error("Seats are no longer available");
      error.statusCode = 400;
      throw error;
    }

    const totalAmount = show.ticketPrice * numberOfTickets;

    const booking = await Booking.create(
      [
        {
          userId,
          movieId: movieObjectId,
          theaterId: theaterObjectId,
          screenNumber: screen.screenNumber,
          showId: showObjectId,
          showDate: show.showDate,
          showTime: show.showTime,
          numberOfTickets,
          totalAmount,
          bookingReference:
            "MOV-" + crypto.randomBytes(5).toString("hex").toUpperCase(),
          status: "confirmed",
        },
      ],
      { session },
    );

    await session.commitTransaction();

    logger.info("Tickets booked successfully", {
      bookingId: booking[0]._id,
      bookingReference: booking[0].bookingReference,
      userId,
      movieId,
      theaterId,
      showId,
      numberOfTickets,
      totalAmount,
    });

    try {
      await deleteBookingCache();
    } catch (cacheError) {
      logger.error("Booking cache invalidation failed", {
        bookingId: booking[0]._id,
        message: cacheError.message,
      });
    }

    return booking[0];
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    logger.error("Book tickets service failed", {
      userId,
      movieId,
      theaterId,
      showId,
      numberOfTickets,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  } finally {
    await session.endSession();
  }
};

const getAllBookingService = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  try {
    const query = {};

    const cacheKey = `Booking:list:v3:${JSON.stringify({
      page,
      limit,
    })}`;

    const cachedData = await getBookingCache(cacheKey);

    if (cachedData) {
      logger.info("Bookings fetched from Redis cache", {
        cacheKey,
      });

      return {
        source: "redis",
        ...cachedData,
      };
    }

    logger.info("Booking cache miss. Fetching from MongoDB", {
      cacheKey,
    });

    const [bookingData, totalBookings] = await Promise.all([
      Booking.find(query)
        .populate("movieId", "name genre language poster")
        .populate("theaterId", "theaterName location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Booking.countDocuments(query),
    ]);

    const responseData = {
      count: bookingData.length,
      totalBookings,
      currentPage: page,
      totalPages: Math.ceil(totalBookings / limit),
      data: bookingData,
    };

    await setBookingCache(cacheKey, responseData, 300);

    logger.info("Bookings fetched successfully from MongoDB", {
      totalBookings,
      currentPage: page,
      count: bookingData.length,
    });

    return {
      source: "mongodb",
      ...responseData,
    };
  } catch (error) {
    logger.error("Get all bookings service failed", {
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

module.exports.getAllBookingService = getAllBookingService;

const cancelBookingService = async ({ bookingId, userId }) => {
  const session = await mongoose.startSession();

  try {
    if (
      !mongoose.Types.ObjectId.isValid(bookingId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      const error = new Error("Invalid booking ID or user ID");
      error.statusCode = 400;
      throw error;
    }

    const bookingObjectId = new mongoose.Types.ObjectId(bookingId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    session.startTransaction();

    const booking = await Booking.findOne({
      _id: bookingObjectId,
      userId: userObjectId,
      status: "confirmed",
    }).session(session);

    if (!booking) {
      const error = new Error("Booking not found or already cancelled");
      error.statusCode = 404;
      throw error;
    }

    const theater = await Theater.findOne({
      _id: booking.theaterId,
      "screens.shows._id": booking.showId,
    }).session(session);

    if (!theater) {
      const error = new Error("Theater or booked show not found");
      error.statusCode = 404;
      throw error;
    }

    const screen = theater.screens.find((screenItem) =>
      screenItem.shows.some(
        (showItem) => showItem._id.toString() === booking.showId.toString(),
      ),
    );

    const show = screen?.shows.find(
      (showItem) => showItem._id.toString() === booking.showId.toString(),
    );

    if (!show) {
      const error = new Error("Booked show not found");
      error.statusCode = 404;
      throw error;
    }

    const maximumAvailableSeats = show.totalSeats - booking.numberOfTickets;

    if (show.availableSeats + booking.numberOfTickets > show.totalSeats) {
      const error = new Error(
        "Cannot restore seats because available seats would exceed total seats",
      );
      error.statusCode = 400;
      throw error;
    }

    const theaterUpdate = await Theater.updateOne(
      {
        _id: booking.theaterId,
        "screens.shows._id": booking.showId,
      },
      {
        $inc: {
          "screens.$[].shows.$[selectedShow].availableSeats":
            booking.numberOfTickets,
        },
      },
      {
        arrayFilters: [
          {
            "selectedShow._id": booking.showId,
            "selectedShow.availableSeats": {
              $lte: maximumAvailableSeats,
            },
          },
        ],
        session,
      },
    );

    if (theaterUpdate.modifiedCount !== 1) {
      const error = new Error("Unable to restore seats");
      error.statusCode = 400;
      throw error;
    }

    booking.status = "cancelled";

    await booking.save({ session });

    await session.commitTransaction();

    logger.info("Booking cancelled successfully", {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      userId,
      theaterId: booking.theaterId,
      showId: booking.showId,
      numberOfTickets: booking.numberOfTickets,
    });

    try {
      await deleteBookingCache();
    } catch (cacheError) {
      logger.error("Booking cache invalidation failed", {
        bookingId: booking._id,
        message: cacheError.message,
      });
    }

    return booking;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    logger.error("Cancel booking service failed", {
      bookingId,
      userId,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  bookTicketsService,
  cancelBookingService,
  getAllBookingService,
};
