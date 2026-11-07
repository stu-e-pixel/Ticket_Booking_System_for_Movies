const Theater = require("../model/theater");
const logger = require("../utils/logger");
const {
  deleteTheaterCache,
  getTheaterCache,
  setTheaterCache,
} = require("../service/TheaterCache");
const mongoose = require("mongoose");
const { deleteMovieCache } = require("./MovieCache");
const Movie = require('../model/movie')

const addTheaterService = async ({
  theaterName,
  location,
  numberOfScreens,
}) => {
  try {
    const existingTheater = await Theater.findOne({
      theaterName,
      isDeleted: false,
    });

    if (existingTheater) {
      logger.warn("Movie already exists", { theaterName });

      const error = new Error("Theater already exists");
      error.statusCode = 409;
      throw error;
    }

    const screens = Array.from({ length: numberOfScreens }, (_, index) => ({
      screenNumber: index + 1,
      shows: [],
    }));
    const theater = await Theater.create({
      theaterName,
      location,
      numberOfScreens,
      screens,
    });

    logger.info("Theater created successfully", {
      theaterId: theater._id,
      theaterName: theater.theaterName,
      numberOfScreens: theater.numberOfScreens,
    });
    await deleteTheaterCache();

    logger.info("Theater cache cleared successfully", {
      theaterId: theater._id,
    });

    return theater;
  } catch (error) {
    logger.error("Add theater service failed", {
      theaterName,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const getAllTheaterService = async ({ theaterName, page, limit }) => {
  const skip = (page - 1) * limit;

  try {
    const query = {
      isDeleted: false,
    };

    if (theaterName) {
      query.theaterName = {
        $regex: theaterName,
        $options: "i",
      };
    }

    const cacheKey = `Theater:list:v2:${JSON.stringify({
      theaterName,
      page,
      limit,
    })}`;

    const cachedData = await getTheaterCache(cacheKey);

    if (cachedData) {
      logger.info("Theater fetched from Redis cache", {
        cacheKey,
      });

      return {
        source: "redis",
        ...cachedData,
      };
    }

    logger.info("Theater cache miss. Fetching from MongoDB", {
      cacheKey,
    });

    const pipeline = [
      {
        $match: query,
      },
      {
        $facet: {
          data: [
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
            {
              $project: {
                theaterName: 1,
                location: 1,
                numberOfScreens: 1,
                isDeleted: 1,
                createdAt: 1,

                screens: {
                  $map: {
                    input: "$screens",
                    as: "screen",
                    in: {
                      screenNumber: "$$screen.screenNumber",

                      shows: {
                        $filter: {
                          input: "$$screen.shows",
                          as: "show",
                          cond: {
                            $eq: ["$$show.isDeleted", false],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
          total: [
            {
              $count: "totalTheaters",
            },
          ],
        },
      },
    ];

    const result = await Theater.aggregate(pipeline);

    const theaterData = result[0]?.data || [];

    const totalTheaters =
      result[0]?.total[0]?.totalTheaters || 0;

    const responseData = {
      count: theaterData.length,
      totalTheaters,
      currentPage: page,
      totalPages: Math.ceil(totalTheaters / limit),
      data: theaterData,
    };

    await setTheaterCache(cacheKey, responseData, 300);

    logger.info("Theaters fetched successfully from MongoDB", {
      totalTheaters,
      currentPage: page,
      count: theaterData.length,
    });

    return {
      source: "mongodb",
      ...responseData,
    };
  } catch (error) {
    logger.error("Get all theaters service failed", {
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const updateTheaterService = async ({
  id,
  theaterName,
  location,
  numberOfScreens,
}) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid Theater ID");
      error.statusCode = 400;
      throw error;
    }

    const existingTheater = await Theater.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingTheater) {
      const error = new Error("Theater not found");
      error.statusCode = 404;
      throw error;
    }

    const updateData = {};

    if (theaterName !== undefined) updateData.theaterName = theaterName;
    if (location !== undefined) updateData.location = location;
    if (numberOfScreens !== undefined)
      updateData.numberOfScreens = numberOfScreens;

    const updatedTheater = await Theater.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedTheater) {
      const error = new Error("Theater update failed");
      error.statusCode = 404;
      throw error;
    }

    await deleteMovieCache();
    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: false,
        },
      },
      {
        $project: {
          theaterName: 1,
          location: 1,
          numberOfScreens: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    const result = await Theater.aggregate(pipeline);

    const theaterData = result[0];

    logger.info("Theater updated successfully", {
      theaterId: id,
      theaterName: theaterData.name,
    });

    return theaterData;
  } catch (error) {
    logger.error("Update theater service failed", {
      theaterId: id,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const deleteTheaterService = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid theater ID");
      error.statusCode = 400;
      throw error;
    }

    const theater = await Theater.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
        },
      },
      {
        new: true,
      },
    );

    if (!theater) {
      const error = new Error("Theater not found");
      error.statusCode = 404;
      throw error;
    }

    await deleteTheaterCache();

    logger.info("Movie deleted successfully", {
      theaterId: id,
      theaterName: theater.theaterName,
    });

    return theater;
  } catch (error) {
    logger.error("Delete movie service failed", {
      theaterId: id,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const retrieveDeletedTheaterService = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid movie ID");
      error.statusCode = 400;
      throw error;
    }

    const theater = await Theater.findOneAndUpdate(
      {
        _id: id,
        isDeleted: true,
      },
      {
        $set: {
          isDeleted: false,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!theater) {
      const error = new Error(
        "Deleted theater not found or movie is already restored",
      );
      error.statusCode = 404;
      throw error;
    }

    logger.info("theater restored successfully", {
      theaterId: id,
      theaterName: theater.theaterName,
    });

    await deleteTheaterCache();

    logger.info("theater cache cleared after restoration", {
      theaterId: id,
    });

    return theater;
  } catch (error) {
    logger.error("Retrieve deleted theater service failed", {
      theaterId: id,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const forceDeleteMovieService = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid theater ID");
      error.statusCode = 400;
      throw error;
    }
    const theater = await Theater.findById(id);

    if (!theater) {
      const error = new Error("theater not found");
      error.statusCode = 404;
      throw error;
    }

    await Theater.findByIdAndDelete(id);

    logger.info("theater permanently deleted", {
      theaterId: id,
      theaterName: theater.theaterName,
    });

    await deleteTheaterCache();

    logger.info("theater cache cleared after force delete", {
      theaterId: id,
    });

    return theater;
  } catch (error) {
    logger.error("Force delete theater service failed", {
      theaterId: id,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const getTheatersByMovieService = async (movieId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      const error = new Error("Invalid movie ID");
      error.statusCode = 400;
      throw error;
    }

    const theaters = await Theater.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $unwind: "$screens",
      },
      {
        $unwind: "$screens.shows",
      },
      {
        $match: {
          "screens.shows.movieId": new mongoose.Types.ObjectId(movieId),
          "screens.shows.status": "active",
          "screens.shows.isDeleted": { $ne: true },
          "screens.shows.showDate": {
            $gte: new Date(),
          },
        },
      },
      {
        $project: {
          _id: 1,
          theaterName: 1,
          location: 1,
          screenNumber: "$screens.screenNumber",
          showId: "$screens.shows._id",
          showDate: "$screens.shows.showDate",
          showTime: "$screens.shows.showTime",
          totalSeats: "$screens.shows.totalSeats",
          availableSeats: "$screens.shows.availableSeats",
          ticketPrice: "$screens.shows.ticketPrice",
        },
      },
    ]);

    logger.info("Theaters fetched successfully for movie", {
      movieId,
      totalTheaters: theaters.length,
    });

    return theaters;
  } catch (error) {
    logger.error("Get theaters by movie service failed", {
      movieId,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const assignMovieService = async ({
  theaterId,
  screenNumber,
  movieId,
  showDate,
  showTime,
  totalSeats,
  ticketPrice,
}) => {
  try {
    
    if (
      !mongoose.Types.ObjectId.isValid(theaterId) ||
      !mongoose.Types.ObjectId.isValid(movieId)
    ) {
      const error = new Error("Invalid theater ID or movie ID");
      error.statusCode = 400;
      throw error;
    }

    
    const movie = await Movie.findOne({
      _id: movieId,
      isDeleted: false,
    });

    if (!movie) {
      const error = new Error("Movie not found");
      error.statusCode = 404;
      throw error;
    }

    
    const theater = await Theater.findOne({
      _id: theaterId,
      isDeleted: false,
    });

    if (!theater) {
      const error = new Error("Theater not found");
      error.statusCode = 404;
      throw error;
    }

    
    const screen = theater.screens.find(
      (item) => item.screenNumber === Number(screenNumber)
    );

    if (!screen) {
      const error = new Error("Screen not found");
      error.statusCode = 404;
      throw error;
    }

  
    const newStart = new Date(showDate);

    if (Number.isNaN(newStart.getTime())) {
      const error = new Error("Invalid show date");
      error.statusCode = 400;
      throw error;
    }

    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(showTime);

    if (!timeMatch) {
      const error = new Error("Invalid show time. Use HH:mm format");
      error.statusCode = 400;
      throw error;
    }

    const [hours, minutes] = showTime.split(":").map(Number);

    newStart.setHours(hours, minutes, 0, 0);

    const newStartMinutes = hours * 60 + minutes;
    const newEndMinutes = newStartMinutes + movie.duration;

    
    const existingShows = screen.shows.filter((show) => {
      const existingDate = new Date(show.showDate);

      return (
        show.status === "active" &&
        existingDate.getFullYear() === newStart.getFullYear() &&
        existingDate.getMonth() === newStart.getMonth() &&
        existingDate.getDate() === newStart.getDate()
      );
    });

    
    const existingMovieIds = [
      ...new Set(
        existingShows.map((show) => show.movieId.toString())
      ),
    ];

    const existingMovies = await Movie.find({
      _id: { $in: existingMovieIds },
    })
      .select("_id duration")
      .lean();

    const durationMap = new Map(
      existingMovies.map((item) => [
        item._id.toString(),
        item.duration,
      ])
    );

    
    const hasOverlap = existingShows.some((show) => {
      const [oldHours, oldMinutes] = show.showTime
        .split(":")
        .map(Number);

      const oldStartMinutes = oldHours * 60 + oldMinutes;

      const oldDuration = durationMap.get(
        show.movieId.toString()
      );

      if (oldDuration === undefined) {
        return false;
      }

      const oldEndMinutes = oldStartMinutes + oldDuration;

      return (
        newStartMinutes < oldEndMinutes &&
        oldStartMinutes < newEndMinutes
      );
    });

    if (hasOverlap) {
      const error = new Error(
        "This show overlaps with an existing show on this screen"
      );
      error.statusCode = 409;
      throw error;
    }

    
    screen.shows.push({
      movieId: movie._id,
      showDate: newStart,
      showTime,
      totalSeats,
      availableSeats: totalSeats,
      ticketPrice,
      status: "active",
    });

    
    await theater.save();

    logger.info("Movie assigned to theater successfully", {
      theaterId,
      theaterName: theater.theaterName,
      screenNumber,
      movieId,
      movieName: movie.name,
      showDate: newStart,
      showTime,
    });

    
    await deleteTheaterCache();

    logger.info("Theater cache cleared after movie assignment", {
      theaterId,
      movieId,
    });

    return theater;
  } catch (error) {
    logger.error("Assign movie service failed", {
      theaterId,
      movieId,
      screenNumber,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};


const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};


const getShowStartDate = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    throw createError(400, "Show date and time are required");
  }

  let year;
  let month;
  let day;

  if (typeof dateValue === "string") {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      year = Number(match[1]);
      month = Number(match[2]) - 1;
      day = Number(match[3]);
    }
  }

  if (year === undefined) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      throw createError(400, "Invalid show date");
    }

    year = date.getFullYear();
    month = date.getMonth();
    day = date.getDate();
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeValue)) {
    throw createError(400, "Invalid show time. Use HH:mm format");
  }

  const [hours, minutes] = timeValue.split(":").map(Number);

  const startDate = new Date(
    year,
    month,
    day,
    hours,
    minutes,
    0,
    0
  );

  if (
    startDate.getFullYear() !== year ||
    startDate.getMonth() !== month ||
    startDate.getDate() !== day
  ) {
    throw createError(400, "Invalid show date");
  }

  return startDate;
};


const assignMovieUpdateService = async ({
  showId,
  theaterId,
  screenNumber,
  movieId,
  showDate,
  showTime,
  totalSeats,
  ticketPrice,
}) => {
  try {

    

    if (
      !mongoose.Types.ObjectId.isValid(showId) ||
      !mongoose.Types.ObjectId.isValid(theaterId)
    ) {
      throw createError(400, "Invalid show ID or theater ID");
    }

    if (
      !Number.isInteger(Number(screenNumber)) ||
      Number(screenNumber) < 1
    ) {
      throw createError(400, "Invalid screen number");
    }

    if (
      movieId &&
      !mongoose.Types.ObjectId.isValid(movieId)
    ) {
      throw createError(400, "Invalid movie ID");
    }


    

    const oldTheater = await Theater.findOne({
      "screens.shows._id": showId,
      isDeleted: false,
    });

    if (!oldTheater) {
      throw createError(404, "Existing show not found");
    }


   

    const oldScreen = oldTheater.screens.find((screen) =>
      screen.shows.some(
        (item) => item._id.toString() === showId.toString()
      )
    );

    if (!oldScreen) {
      throw createError(404, "Existing screen not found");
    }




    const existingShow = oldScreen.shows.id(showId);

    if (!existingShow) {
      throw createError(404, "Show not found");
    }

    if (existingShow.status !== "active") {
      throw createError(
        400,
        "Only active shows can be updated"
      );
    }




    const isSameTheater =
      oldTheater._id.toString() === theaterId.toString();

    let newTheater;

    if (isSameTheater) {
      newTheater = oldTheater;
    } else {
      newTheater = await Theater.findOne({
        _id: theaterId,
        isDeleted: false,
      });
    }

    if (!newTheater) {
      throw createError(404, "Destination theater not found");
    }



    const newScreen = newTheater.screens.find(
      (screen) =>
        screen.screenNumber === Number(screenNumber)
    );

    if (!newScreen) {
      throw createError(
        404,
        "Destination screen not found"
      );
    }




    const finalMovieId = movieId || existingShow.movieId;

    const movie = await Movie.findOne({
      _id: finalMovieId,
      isDeleted: false,
    });

    if (!movie) {
      throw createError(404, "Active movie not found");
    }

    if (
      !Number.isFinite(movie.duration) ||
      movie.duration <= 0
    ) {
      throw createError(400, "Movie duration is invalid");
    }




    const finalShowDate =
      showDate !== undefined
        ? showDate
        : existingShow.showDate;

    const finalShowTime =
      showTime !== undefined
        ? showTime
        : existingShow.showTime;

    const newStart = getShowStartDate(
      finalShowDate,
      finalShowTime
    );

    const newEnd = new Date(
      newStart.getTime() + movie.duration * 60 * 1000
    );



    const bookedSeats =
      Number(existingShow.totalSeats) -
      Number(existingShow.availableSeats);

    const finalTotalSeats =
      totalSeats !== undefined
        ? Number(totalSeats)
        : Number(existingShow.totalSeats);

    if (
      !Number.isInteger(finalTotalSeats) ||
      finalTotalSeats < 1
    ) {
      throw createError(400, "Invalid total seats");
    }

    if (finalTotalSeats < bookedSeats) {
      throw createError(
        400,
        `Total seats cannot be less than booked seats (${bookedSeats})`
      );
    }

    const finalAvailableSeats =
      finalTotalSeats - bookedSeats;




    const otherActiveShows = newScreen.shows.filter(
      (item) =>
        item._id.toString() !== showId.toString() &&
        item.status === "active"
    );




    const existingMovieIds = otherActiveShows.map(
      (item) => item.movieId
    );

    const existingMovies = await Movie.find({
      _id: { $in: existingMovieIds },
    }).select("_id duration");

    const durationMap = new Map(
      existingMovies.map((item) => [
        item._id.toString(),
        item.duration,
      ])
    );




    for (const otherShow of otherActiveShows) {

      const otherMovieDuration = durationMap.get(
        otherShow.movieId.toString()
      );

      if (
        !Number.isFinite(otherMovieDuration) ||
        otherMovieDuration <= 0
      ) {
        throw createError(
          400,
          "Another active show's movie duration is unavailable"
        );
      }

      const otherStart = getShowStartDate(
        otherShow.showDate,
        otherShow.showTime
      );

      const otherEnd = new Date(
        otherStart.getTime() +
        otherMovieDuration * 60 * 1000
      );

      const isOverlapping =
        newStart.getTime() < otherEnd.getTime() &&
        otherStart.getTime() < newEnd.getTime();

      if (isOverlapping) {
        throw createError(
          409,
          "Another movie is already scheduled during this time on the selected screen"
        );
      }
    }



    const updatedShowData = {
      movieId: movie._id,
      showDate: newStart,
      showTime: finalShowTime,
      totalSeats: finalTotalSeats,
      availableSeats: finalAvailableSeats,
      ticketPrice:
        ticketPrice !== undefined
          ? Number(ticketPrice)
          : existingShow.ticketPrice,
      status: existingShow.status,
    };



    const isSameLocation =
      isSameTheater &&
      oldScreen.screenNumber === Number(screenNumber);

    let updatedShow;

    if (isSameLocation) {



      existingShow.movieId = updatedShowData.movieId;
      existingShow.showDate = updatedShowData.showDate;
      existingShow.showTime = updatedShowData.showTime;
      existingShow.totalSeats = updatedShowData.totalSeats;
      existingShow.availableSeats = updatedShowData.availableSeats;
      existingShow.ticketPrice = updatedShowData.ticketPrice;

      await oldTheater.save();

      updatedShow = existingShow;

    } else {

      const showToMove = {
        _id: existingShow._id,
        ...updatedShowData,
      };

      oldScreen.shows.pull({
        _id: showId,
      });

      newScreen.shows.push(showToMove);

      if (isSameTheater) {

        await oldTheater.save();

      } else {

        await oldTheater.save();
        await newTheater.save();

      }

      updatedShow = newScreen.shows.find(
        (item) =>
          item._id.toString() === showId.toString()
      );

      if (!updatedShow) {
        throw createError(
          500,
          "Show not found after moving to destination screen"
        );
      }
    }

    const verifyTheater = await Theater.findOne({
      _id: theaterId,
      "screens.screenNumber": Number(screenNumber),
    });

    const verifyScreen = verifyTheater?.screens.find(
      (screen) =>
        screen.screenNumber === Number(screenNumber)
    );

    const verifyShow = verifyScreen?.shows.find(
      (item) =>
        item._id.toString() === showId.toString()
    );

    if (!verifyShow) {
      throw createError(
        500,
        "Show update could not be verified in destination theater"
      );
    }

    await deleteTheaterCache();


    logger.info("Movie show updated successfully", {
      showId,
      oldTheaterId: oldTheater._id,
      newTheaterId: newTheater._id,
      oldScreenNumber: oldScreen.screenNumber,
      newScreenNumber: Number(screenNumber),
      movieId: movie._id,
    });

    return verifyShow;

  } catch (error) {

    logger.error("Assign movie update service failed", {
      showId,
      theaterId,
      screenNumber,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const getAllAssignMovieService = async ({
  theaterName,
  movieName,
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  try {
    const matchQuery = {
      isDeleted: false,
    };

    if (theaterName) {
      matchQuery.theaterName = {
        $regex: theaterName,
        $options: "i",
      };
    }

    // v2 prevents old cached results from being reused
    const cacheKey = `Theater:AssignedMovies:v2:${JSON.stringify({
      theaterName,
      movieName,
      page,
      limit,
    })}`;

    const cachedData = await getTheaterCache(cacheKey);

    if (cachedData) {
      logger.info("Assigned movies fetched from Redis cache", {
        cacheKey,
      });

      return {
        source: "redis",
        ...cachedData,
      };
    }

    logger.info("Assigned movie cache miss. Fetching from MongoDB", {
      cacheKey,
    });

    const pipeline = [
      {
        $match: matchQuery,
      },
      {
        $unwind: "$screens",
      },
      {
        $unwind: "$screens.shows",
      },

      // Exclude soft-deleted shows
      {
        $match: {
          "screens.shows.isDeleted": { $ne: true },
        },
      },

      {
        $lookup: {
          from: "movies",
          localField: "screens.shows.movieId",
          foreignField: "_id",
          as: "movie",
        },
      },
      {
        $unwind: {
          path: "$movie",
          preserveNullAndEmptyArrays: false,
        },
      },
    ];

    // Search by movie name
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

    pipeline.push({
      $facet: {
        data: [
          {
            $sort: {
              "screens.shows.showDate": -1,
              "screens.shows.showTime": 1,
            },
          },
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
          {
            $project: {
              _id: 0,

              showId: "$screens.shows._id",
              theaterId: "$_id",
              theaterName: "$theaterName",
              location: "$location",
              screenNumber: "$screens.screenNumber",

              movie: {
                _id: "$movie._id",
                name: "$movie.name",
                duration: "$movie.duration",
                genre: "$movie.genre",
                language: "$movie.language",
                poster: "$movie.poster",
              },

              showDate: "$screens.shows.showDate",
              showTime: "$screens.shows.showTime",
              totalSeats: "$screens.shows.totalSeats",
              availableSeats: "$screens.shows.availableSeats",
              ticketPrice: "$screens.shows.ticketPrice",
              status: "$screens.shows.status",

              isDeleted: "$screens.shows.isDeleted",
            },
          },
        ],
        total: [
          {
            $count: "totalAssignedMovies",
          },
        ],
      },
    });

    const result = await Theater.aggregate(pipeline);

    const assignedMovieData = result[0]?.data || [];

    const totalAssignedMovies =
      result[0]?.total[0]?.totalAssignedMovies || 0;

    const responseData = {
      count: assignedMovieData.length,
      totalAssignedMovies,
      currentPage: page,
      totalPages: Math.ceil(totalAssignedMovies / limit),
      data: assignedMovieData,
    };

    await setTheaterCache(cacheKey, responseData, 300);

    logger.info("Assigned movies fetched successfully from MongoDB", {
      totalAssignedMovies,
      currentPage: page,
      count: assignedMovieData.length,
    });

    return {
      source: "mongodb",
      ...responseData,
    };
  } catch (error) {
    logger.error("Get all assigned movies service failed", {
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const deleteAssignMovieService = async (showId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(showId)) {
      const error = new Error("Invalid assigned movie ID");
      error.statusCode = 400;
      throw error;
    }

    const theater = await Theater.findOneAndUpdate(
      {
        isDeleted: false,
        "screens.shows._id": showId,
        "screens.shows.isDeleted": { $ne: true },
      },
      {
        $set: {
          "screens.$[].shows.$[show].isDeleted": true,
        },
      },
      {
        new: true,
        arrayFilters: [
          {
            "show._id": new mongoose.Types.ObjectId(showId),
            "show.isDeleted": { $ne: true },
          },
        ],
      },
    );

    if (!theater) {
      const error = new Error(
        "Assigned movie not found or already deleted",
      );
      error.statusCode = 404;
      throw error;
    }

    await deleteTheaterCache();

    logger.info("Assigned movie soft deleted successfully", {
      showId,
      theaterId: theater._id,
    });

    return theater;
  } catch (error) {
    logger.error("Delete assigned movie service failed", {
      showId,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const retrieveDeletedAssignMovieService = async (showId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(showId)) {
      const error = new Error("Invalid assigned movie ID");
      error.statusCode = 400;
      throw error;
    }

    const theater = await Theater.findOneAndUpdate(
      {
        isDeleted: false,
        "screens.shows._id": showId,
        "screens.shows.isDeleted": true,
      },
      {
        $set: {
          "screens.$[].shows.$[show].isDeleted": false,
        },
      },
      {
        new: true,
        runValidators: true,
        arrayFilters: [
          {
            "show._id": new mongoose.Types.ObjectId(showId),
            "show.isDeleted": true,
          },
        ],
      },
    );

    if (!theater) {
      const error = new Error(
        "Deleted assigned movie not found or already restored",
      );
      error.statusCode = 404;
      throw error;
    }

    await deleteTheaterCache();

    logger.info("Assigned movie restored successfully", {
      showId,
      theaterId: theater._id,
    });

    return theater;
  } catch (error) {
    logger.error("Retrieve deleted assigned movie service failed", {
      showId,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const forceDeleteAssignMovieService = async (showId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(showId)) {
      const error = new Error("Invalid assigned movie ID");
      error.statusCode = 400;
      throw error;
    }

    const theater = await Theater.findOne({
      "screens.shows._id": showId,
      isDeleted: false,
    });

    if (!theater) {
      const error = new Error("Assigned movie not found");
      error.statusCode = 404;
      throw error;
    }

    const show = theater.screens
      .flatMap((screen) => screen.shows)
      .find((item) => item._id.toString() === showId);

    if (!show) {
      const error = new Error("Assigned show not found");
      error.statusCode = 404;
      throw error;
    }

    const result = await Theater.updateOne(
      {
        _id: theater._id,
        "screens.shows._id": new mongoose.Types.ObjectId(showId),
      },
      {
        $pull: {
          "screens.$[].shows": {
            _id: new mongoose.Types.ObjectId(showId),
          },
        },
      },
    );

    if (result.modifiedCount === 0) {
      const error = new Error(
        "Failed to permanently delete assigned movie",
      );
      error.statusCode = 404;
      throw error;
    }

    // Verify that the show no longer exists
    const showExists = await Theater.exists({
      "screens.shows._id": new mongoose.Types.ObjectId(showId),
    });

    if (showExists) {
      const error = new Error(
        "Assigned movie still exists after force delete",
      );
      error.statusCode = 500;
      throw error;
    }

    // Clear all theater-related cache
    await deleteTheaterCache();

    logger.info("Assigned movie permanently deleted", {
      showId,
      theaterId: theater._id,
      movieId: show.movieId,
    });

    return {
      showId,
      theaterId: theater._id,
      movieId: show.movieId,
    };
  } catch (error) {
    logger.error("Force delete assigned movie service failed", {
      showId,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};






module.exports = {
  addTheaterService,
  getAllTheaterService,
  updateTheaterService,
  deleteTheaterService,
  retrieveDeletedTheaterService,
  forceDeleteMovieService,
  assignMovieService,
  assignMovieUpdateService,
  getAllAssignMovieService,
  deleteAssignMovieService,
  retrieveDeletedAssignMovieService,
  forceDeleteAssignMovieService,
  getTheatersByMovieService
};
