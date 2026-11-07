const Movie = require("../model/movie");
const cloudinary = require("../config/cloudinary.config");
const logger = require("../utils/logger");
const Theater = require("../model/theater");

const mongoose = require("mongoose");
const {
  getMovieCache,
  setMovieCache,
  deleteMovieCache,
} = require("./MovieCache");

const addMovieService = async ({
  name,
  genre,
  language,
  duration,
  cast,
  director,
  releaseDate,
  description,
  file,
}) => {
  const existingMovie = await Movie.findOne({
    name,
    isDeleted: false,
  });

  if (existingMovie) {
    if (file) {
      await cloudinary.uploader.destroy(file.filename);
    }

    logger.warn("Movie already exists", { name });

    const error = new Error("Movie already exists");
    error.statusCode = 409;
    throw error;
  }

  const createMovie = new Movie({
    name,
    genre: Array.isArray(genre)
      ? genre
      : genre.split(",").map((item) => item.trim()),

    language,
    duration: Number(duration),

    cast: Array.isArray(cast)
      ? cast
      : cast.split(",").map((item) => item.trim()),

    director,
    releaseDate,
    description,
  });

  if (file) {
    createMovie.poster.url = file.path;
    createMovie.poster.public_id = file.filename;
  }

  const movieData = await createMovie.save();
  await deleteMovieCache();

  return movieData;
};

const getAllMoviesService = async ({ name, genre, page, limit }) => {
  const skip = (page - 1) * limit;

  try {
    const query = {
      isDeleted: false,
    };

    if (name) {
      query.name = {
        $regex: name,
        $options: "i",
      };
    }

    if (genre) {
      query.genre = {
        $elemMatch: {
          $regex: genre,
          $options: "i",
        },
      };
    }

    const cacheKey = `Movie:list:${JSON.stringify({
      name,
      genre,
      page,
      limit,
    })}`;

    const cachedData = await getMovieCache(cacheKey);

    if (cachedData) {
      logger.info("Movies fetched from Redis cache", {
        cacheKey,
      });

      return {
        source: "redis",
        ...cachedData,
      };
    }

    logger.info("Movie cache miss. Fetching from MongoDB", {
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

    const movieData = result[0]?.data || [];

    const totalMovies = result[0]?.total[0]?.totalMovies || 0;

    const responseData = {
      count: movieData.length,
      totalMovies,
      currentPage: page,
      totalPages: Math.ceil(totalMovies / limit),
      data: movieData,
    };

    await setMovieCache(cacheKey, responseData, 300);

    logger.info("Movies fetched successfully from MongoDB", {
      totalMovies,
      currentPage: page,
      count: movieData.length,
    });

    return {
      source: "mongodb",
      ...responseData,
    };
  } catch (error) {
    logger.error("Get all movies service failed", {
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const updateMovieService = async ({
  id,
  name,
  genre,
  language,
  duration,
  cast,
  director,
  releaseDate,
  description,
  file,
}) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid movie ID");
      error.statusCode = 400;
      throw error;
    }

    const existingMovie = await Movie.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingMovie) {
      const error = new Error("Movie not found");
      error.statusCode = 404;
      throw error;
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (genre !== undefined) updateData.genre = genre;
    if (language !== undefined) updateData.language = language;
    if (duration !== undefined) updateData.duration = duration;
    if (cast !== undefined) updateData.cast = cast;
    if (director !== undefined) updateData.director = director;
    if (releaseDate !== undefined) updateData.releaseDate = releaseDate;
    if (description !== undefined) updateData.description = description;

    if (file) {
      updateData.poster = {
        url: file.path,
        public_id: file.filename,
      };
    }
    const updatedMovie = await Movie.findOneAndUpdate(
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

    if (!updatedMovie) {
      const error = new Error("Movie update failed");
      error.statusCode = 404;
      throw error;
    }
    if (file && existingMovie.poster?.public_id) {
      try {
        await cloudinary.uploader.destroy(existingMovie.poster.public_id);
      } catch (cloudinaryError) {
        logger.error("Old movie poster deletion failed", {
          movieId: id,
          message: cloudinaryError.message,
        });
      }
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
          name: 1,
          genre: 1,
          language: 1,
          duration: 1,
          cast: 1,
          director: 1,
          releaseDate: 1,
          description: 1,
          poster: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    const result = await Movie.aggregate(pipeline);

    const movieData = result[0];

    logger.info("Movie updated successfully", {
      movieId: id,
      movieName: movieData.name,
    });

    return movieData;
  } catch (error) {
    logger.error("Update movie service failed", {
      movieId: id,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const deleteMovieService = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid movie ID");
      error.statusCode = 400;
      throw error;
    }

    const movie = await Movie.findOneAndUpdate(
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

    if (!movie) {
      const error = new Error("Movie not found");
      error.statusCode = 404;
      throw error;
    }

    const theaterResult = await Theater.updateMany(
      {
        "screens.shows.movieId": movie._id,
      },
      {
        $set: {
          "screens.$[].shows.$[show].status": "cancelled",
        },
      },
      {
        arrayFilters: [
          {
            "show.movieId": movie._id,
            "show.status": "active",
          },
        ],
      },
    );

    await deleteMovieCache();

    logger.info("Movie deleted successfully", {
      movieId: id,
      movieName: movie.name,
      cancelledShows: theaterResult.modifiedCount,
    });

    return movie;
  } catch (error) {
    logger.error("Delete movie service failed", {
      movieId: id,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const retrieveDeletedMovieService = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid movie ID");
      error.statusCode = 400;
      throw error;
    }

    const movie = await Movie.findOneAndUpdate(
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

    if (!movie) {
      const error = new Error(
        "Deleted movie not found or movie is already restored",
      );
      error.statusCode = 404;
      throw error;
    }

    logger.info("Movie restored successfully", {
      movieId: id,
      movieName: movie.name,
    });

    await deleteMovieCache();

    logger.info("Movie cache cleared after restoration", {
      movieId: id,
    });

    return movie;
  } catch (error) {
    logger.error("Retrieve deleted movie service failed", {
      movieId: id,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

const forceDeleteMovieService = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid movie ID");
      error.statusCode = 400;
      throw error;
    }
    const movie = await Movie.findById(id);

    if (!movie) {
      const error = new Error("Movie not found");
      error.statusCode = 404;
      throw error;
    }

    const forcedelete = await Movie.findByIdAndDelete(id);

    if (forcedelete.poster.public_id) {
      try {
        await cloudinary.uploader.destroy(forcedelete.poster.public_id);
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion failed:", cloudinaryError);
      }
    }

    logger.info("Movie permanently deleted", {
      movieId: id,
      movieName: movie.name,
    });

    const theaterResult = await Theater.updateMany(
      { "screens.shows.movieId": movie._id },
      {
        $pull: {
          "screens.$[].shows": {
            movieId: movie._id,
          },
        },
      },
    );

    logger.info("Related movie shows removed from theaters", {
      movieId: id,
      matchedCount: theaterResult.matchedCount,
      modifiedCount: theaterResult.modifiedCount,
    });

    await deleteMovieCache();

    logger.info("Movie cache cleared after force delete", {
      movieId: id,
    });

    return movie;
  } catch (error) {
    logger.error("Force delete movie service failed", {
      movieId: id,
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

module.exports = {
  addMovieService,
  getAllMoviesService,
  updateMovieService,
  deleteMovieService,
  retrieveDeletedMovieService,
  forceDeleteMovieService,
};
