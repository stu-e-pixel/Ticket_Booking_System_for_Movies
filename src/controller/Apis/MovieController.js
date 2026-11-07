const Movie = require("../../model/movie");
const statuscode = require("../../utils/statuscode");
const MovieService = require("../../service/movieService");
const logger = require("../../utils/logger");


class MovieController {

  async addMovie(req, res) {
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
        name,
        genre,
        language,
        duration,
        cast,
        director,
        releaseDate,
        description,
      } = req.body;

      logger.info("Movie creation attempt started", { name });

      const moviedata = await MovieService.addMovieService({
        name,
        genre,
        language,
        duration,
        cast,
        director,
        releaseDate,
        description,
        file: req.file,
      });

      logger.info("Movie created successfully", {
        movieId: moviedata._id,
        movieName: moviedata.name,
      });

      return res.status(statuscode.CREATED).json({
        status: true,
        message: "Movie created successfully",
        data: moviedata,
      });
    } catch (error) {
      logger.error("Movie creation failed", {
        message: error.message,
        stack: error.stack,
      });

      return res.status(error.statusCode || statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

 
  
async getAllMovies(req, res) {
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
    const { name, genre } = req.query;

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    logger.info("Get all movies request started", {
      name,
      genre,
      page,
      limit,
    });

    const movieData = await MovieService.getAllMoviesService({
      name,
      genre,
      page,
      limit,
    });
    logger.info("Get all movies completed successfully", {
      source: movieData.source,
      totalMovies: movieData.totalMovies,
    });

    
    return res.status(statuscode.OK).json({
      status: true,
      ...movieData,
    });

  } catch (error) {
    logger.error("Get all movies controller failed", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(
      error.statusCode || statuscode.SERVER_ERROR
    ).json({
      status: false,
      message: error.message,
    });
  }
}


  async getMovieById(req, res) {
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
      

      const movie = await Movie.findOne({
        _id: req.params.id,
        isDeleted: false,
      });

      if (!movie) {
        return res.status(404).json({
          status: false,
          message: "Movie not found",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Movie fetched successfully",
        data: movie,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }

  
  
async updateMovie(req, res) {
  try {
    const { id } = req.params;
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
      name,
      genre,
      language,
      duration,
      cast,
      director,
      releaseDate,
      description,
    } = req.body;

    logger.info("Movie update request started", {
      movieId: id,
    });

    // 4. Call update service
    const moviedata = await MovieService.updateMovieService({
      id,
      name,
      genre,
      language,
      duration,
      cast,
      director,
      releaseDate,
      description,
      file: req.file,
    });

    return res.status(statuscode.OK).json({
      status: true,
      message: "Movie updated successfully",
      data: moviedata,
    });

  } catch (error) {
    logger.error("Update movie controller failed", {
      message: error.message,
      stack: error.stack,
    });

    if (error.noChanges) {
    return res.status(statuscode.OK).json({
      status: true,
      message: error.message,
      updated: false,
    });
  }

    return res
      .status(error.statusCode || statuscode.SERVER_ERROR)
      .json({
        status: false,
        message: error.message,
      });
  }
}

  
async deleteMovie(req, res) {
  try {
    const { id } = req.params;
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

    logger.info("Movie delete request started", {
      movieId: id,
      userId: req.user?._id,
    });
    const movie = await MovieService.deleteMovieService(id);

    return res.status(statuscode.OK).json({
      status: true,
      message: "Movie deleted successfully",
      data: movie,
    });

  } catch (error) {
    logger.error("Delete movie controller failed", {
      movieId: req.params.id,
      message: error.message,
      stack: error.stack,
    });

    return res
      .status(error.statusCode || statuscode.SERVER_ERROR)
      .json({
        status: false,
        message: error.message,
      });
  }
}


async retrieveDeletedMovie(req, res) {
  try {
    const { id } = req.params;
    
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

    logger.info("Retrieve deleted movie request started", {
      movieId: id,
      userId: req.user._id,
    });

    
    const movieData =
      await MovieService.retrieveDeletedMovieService(id);
    return res.status(statuscode.OK).json({
      status: true,
      message: "Movie restored successfully",
      data: movieData,
    });

  } catch (error) {
    logger.error("Retrieve deleted movie controller failed", {
      movieId: req.params.id,
      message: error.message,
      stack: error.stack,
    });

    return res
      .status(error.statusCode || statuscode.SERVER_ERROR)
      .json({
        status: false,
        message: error.message,
      });
  }
}

async forceDeleteMovie(req, res) {
  try {
    const { id } = req.params;
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

    logger.info("Force delete movie request started", {
      movieId: id,
      userId: req.user._id,
    });

    const movieData =
      await MovieService.forceDeleteMovieService(id);

    return res.status(statuscode.OK).json({
      status: true,
      message: "Movie permanently deleted successfully",
      data: movieData,
    });
  } catch (error) {
    logger.error("Force delete movie controller failed", {
      movieId: req.params.id,
      message: error.message,
      stack: error.stack,
    });

    return res
      .status(error.statusCode || statuscode.SERVER_ERROR)
      .json({
        status: false,
        message: error.message,
      });
  }
}


}

module.exports = new MovieController();
