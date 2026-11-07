
const Movie = require("../model/movie");
const logger = require("../utils/logger");
const Booking = require("../model/booking");
const transporter = require("../config/email.config"); 


const {
  getBookingCache,
  setBookingCache,
} = require("./BookingCache");

const getMovieBookingReportService = async ({
  movieName,
  genre,
  language,
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  try {
    
    const matchQuery = {
      isDeleted: false,
    };

    if (movieName) {
      matchQuery.name = {
        $regex: movieName,
        $options: "i",
      };
    }

    if (genre) {
      matchQuery.genre = {
        $regex: genre,
        $options: "i",
      };
    }

    if (language) {
      matchQuery.language = {
        $regex: language,
        $options: "i",
      };
    }

    
    const cacheKey = `Booking:MovieReport:v1:${JSON.stringify({
      movieName,
      genre,
      language,
      page,
      limit,
    })}`;

    const cachedData = await getBookingCache(cacheKey);

    if (cachedData) {
      logger.info("Movie booking report fetched from Redis cache", {
        cacheKey,
      });

      return {
        source: "redis",
        ...cachedData,
      };
    }

    logger.info("Movie booking report cache miss", {
      cacheKey,
    });

    const pipeline = [
      {
        $match: matchQuery,
      },
      {
        $lookup: {
          from: "bookings",
          let: {
            movieId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$movieId", "$$movieId"],
                    },
                    {
                      $eq: ["$status", "confirmed"],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                numberOfTickets: 1,
                totalAmount: 1,
              },
            },
          ],
          as: "confirmedBookings",
        },
      },
      {
        $addFields: {
          totalBookings: {
            $size: "$confirmedBookings",
          },
          totalTickets: {
            $sum: {
              $map: {
                input: "$confirmedBookings",
                as: "booking",
                in: {
                  $ifNull: ["$$booking.numberOfTickets", 0],
                },
              },
            },
          },
          totalRevenue: {
            $sum: {
              $map: {
                input: "$confirmedBookings",
                as: "booking",
                in: {
                  $ifNull: ["$$booking.totalAmount", 0],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          name: 1,
          genre: 1,
          language: 1,
          poster: 1,
          totalBookings: 1,
          totalTickets: 1,
          totalRevenue: 1,
        },
      },
      {
        $facet: {
          data: [
            {
              $sort: {
                totalTickets: -1,
                createdAt: -1,
              },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
          total: [
            {
              $count: "totalMovies",
            },
          ],
        },
      },
    ];

    const result = await Movie.aggregate(pipeline);

    const reportData = result[0]?.data || [];

    const totalMovies =
      result[0]?.total[0]?.totalMovies || 0;

    const responseData = {
      count: reportData.length,
      totalMovies,
      currentPage: page,
      totalPages: Math.ceil(totalMovies / limit),
      data: reportData,
    };

    
    await setBookingCache(cacheKey, responseData, 300);

    logger.info("Movie booking report generated successfully", {
      totalMovies,
      currentPage: page,
      count: reportData.length,
    });

    return {
      source: "mongodb",
      ...responseData,
    };

  } catch (error) {
    logger.error("Get movie booking report service failed", {
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};



const getTheaterBookingReportService = async ({
  theaterName,
  location,
  movieName,
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  try {
    // Search and filter conditions
    const matchQuery = {
      status: "confirmed",
    };

    // Redis cache key
    const cacheKey = `Booking:TheaterReport:v1:${JSON.stringify({
      theaterName,
      location,
      movieName,
      page,
      limit,
    })}`;

    const cachedData = await getBookingCache(cacheKey);

    if (cachedData) {
      logger.info("Theater booking report fetched from Redis cache", {
        cacheKey,
      });

      return {
        source: "redis",
        ...cachedData,
      };
    }

    logger.info("Theater booking report cache miss", {
      cacheKey,
    });

    const pipeline = [
      {
        $match: matchQuery,
      },
      {
        $lookup: {
          from: "movies",
          localField: "movieId",
          foreignField: "_id",
          as: "movie",
        },
      },
      {
        $unwind: "$movie",
      },
      {
        $lookup: {
          from: "theaters",
          localField: "theaterId",
          foreignField: "_id",
          as: "theater",
        },
      },
      {
        $unwind: "$theater",
      },
    ];

    // Theater name search
    if (theaterName) {
      pipeline.push({
        $match: {
          "theater.theaterName": {
            $regex: theaterName,
            $options: "i",
          },
        },
      });
    }

    // Location filter
    if (location) {
      pipeline.push({
        $match: {
          "theater.location": {
            $regex: location,
            $options: "i",
          },
        },
      });
    }

    // Movie name search
    if (movieName) {
      pipeline.push({
        $match: {
          "movie.name": {
            $regex: movieName,
            $options: "i",
          },
        },
      });
    }

    // Group bookings by theater and show
    pipeline.push(
      {
        $group: {
          _id: {
            theaterId: "$theaterId",
            theaterName: "$theater.theaterName",
            location: "$theater.location",
            movieName: "$movie.name",
            showId: "$showId",
            showDate: "$showDate",
            showTime: "$showTime",
          },

          totalBookings: {
            $sum: 1,
          },

          totalTickets: {
            $sum: "$numberOfTickets",
          },

          totalRevenue: {
            $sum: "$totalAmount",
          },
        },
      },

      // Group shows by theater
      {
        $group: {
          _id: {
            theaterId: "$_id.theaterId",
            theaterName: "$_id.theaterName",
            location: "$_id.location",
          },

          shows: {
            $push: {
              movieName: "$_id.movieName",
              showId: "$_id.showId",
              showDate: "$_id.showDate",
              showTime: "$_id.showTime",
              totalBookings: "$totalBookings",
              totalTickets: "$totalTickets",
              totalRevenue: "$totalRevenue",
            },
          },

          totalBookings: {
            $sum: "$totalBookings",
          },

          totalTickets: {
            $sum: "$totalTickets",
          },

          totalRevenue: {
            $sum: "$totalRevenue",
          },
        },
      },

      // Final projection
      {
        $project: {
          _id: 0,
          theaterId: "$_id.theaterId",
          theaterName: "$_id.theaterName",
          location: "$_id.location",
          shows: 1,
          totalBookings: 1,
          totalTickets: 1,
          totalRevenue: 1,
        },
      },

      // Pagination and total count
      {
        $facet: {
          data: [
            {
              $sort: {
                totalTickets: -1,
              },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
          total: [
            {
              $count: "totalTheaters",
            },
          ],
        },
      }
    );

    const result = await Booking.aggregate(pipeline);

    const reportData = result[0]?.data || [];

    const totalTheaters =
      result[0]?.total[0]?.totalTheaters || 0;

    const responseData = {
      count: reportData.length,
      totalTheaters,
      currentPage: page,
      totalPages: Math.ceil(totalTheaters / limit),
      data: reportData,
    };

    // Save report in Redis
    await setBookingCache(cacheKey, responseData, 300);

    logger.info("Theater booking report generated successfully", {
      totalTheaters,
      currentPage: page,
      count: reportData.length,
    });

    return {
      source: "mongodb",
      ...responseData,
    };

  } catch (error) {
    logger.error("Get theater booking report service failed", {
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};


const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const sendBookingSummaryService = async ({ userId, userEmail }) => {
  try {
    logger.info("Send booking summary service started", { userId });

    const bookings = await Booking.find({ userId })
      .populate("movieId", "name language")
      .populate("theaterId", "theaterName location")
      .sort({ createdAt: -1 });

    if (!bookings.length) {
      return null;
    }

    
    const confirmedBookings = bookings.filter(
      (booking) => booking.status === "confirmed"
    );

    const totalTickets = confirmedBookings.reduce(
      (total, booking) => total + (booking.numberOfTickets || 0),
      0
    );

    const totalAmount = confirmedBookings.reduce(
      (total, booking) => total + (booking.totalAmount || 0),
      0
    );

    
    const bookingRows = bookings
      .map((booking) => {
        const movieName = escapeHtml(
          booking.movieId?.name || "Movie unavailable"
        );

        const theaterName = escapeHtml(
          booking.theaterId?.theaterName || "Theater unavailable"
        );

        const bookingReference = escapeHtml(
          booking.bookingReference || "N/A"
        );

        const showDate = booking.showDate
          ? new Date(booking.showDate).toDateString()
          : "N/A";

        const showTime = escapeHtml(booking.showTime || "N/A");
        const status = escapeHtml(booking.status || "N/A");

        return `
          <tr>
            <td>${bookingReference}</td>
            <td>${movieName}</td>
            <td>${theaterName}</td>
            <td>${showDate}</td>
            <td>${showTime}</td>
            <td>${booking.numberOfTickets || 0}</td>
            <td>₹${booking.totalAmount || 0}</td>
            <td>${status}</td>
          </tr>
        `;
      })
      .join("");

    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: "Your Movie Booking Summary",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Movie Booking Summary</h2>

          <h3>Your Booking Statistics</h3>

          <p><strong>Total confirmed tickets:</strong> ${totalTickets}</p>
          <p><strong>Total confirmed amount:</strong> ₹${totalAmount}</p>

          <h3>Booking History</h3>

          <table
            border="1"
            cellpadding="8"
            cellspacing="0"
            style="border-collapse: collapse; width: 100%;"
          >
            <thead>
              <tr>
                <th>Booking Reference</th>
                <th>Movie</th>
                <th>Theater</th>
                <th>Date</th>
                <th>Time</th>
                <th>Tickets</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              ${bookingRows}
            </tbody>
          </table>

          <p>Thank you for booking with us!</p>
        </div>
      `,
    });

    const responseData = {
      email: userEmail,
      totalTickets,
      totalAmount,
      totalBookings: bookings.length,
    };

    logger.info("Booking summary email sent successfully", {
      userId,
      email: userEmail,
      totalBookings: bookings.length,
    });

    return responseData;
  } catch (error) {
    logger.error("Send booking summary service failed", {
      userId,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};






module.exports ={getMovieBookingReportService,getTheaterBookingReportService,sendBookingSummaryService};
