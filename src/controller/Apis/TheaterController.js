const Theater = require("../../model/theater");
const Movie = require("../../model/movie");
const TheaterService = require("../../service/theaterService");
const logger = require('../../utils/logger')
const { deleteTheaterCache } = require("../../service/TheaterCache");
const statuscode = require("../../utils/statuscode");

class TheaterController {
  async addTheater(req, res) {
    try {
      const { theaterName, location, numberOfScreens } = req.body;

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

      logger.info("Add theater request started", {
        theaterName,
        numberOfScreens,
        userId: req.user?._id,
      });

      const theaterData = await TheaterService.addTheaterService({
        theaterName,
        location,
        numberOfScreens,
      });

      return res.status(statuscode.CREATED || 201).json({
        status: true,
        message: "Theater created successfully",
        data: theaterData,
      });
    } catch (error) {
      logger.error("Add theater controller failed", {
        theaterName: req.body?.theaterName,
        message: error.message,
        stack: error.stack,
      });

      return res
        .status(error.statusCode || statuscode.SERVER_ERROR || 500)
        .json({
          status: false,
          message: error.message,
        });
    }
  }

  async getAllTheaters(req, res) {
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
      const { theaterName } = req.query;
  
      const page = Math.max(
        1,
        Number(req.query.page) || 1
      );
  
      const limit = Math.min(
        100,
        Math.max(1, Number(req.query.limit) || 10)
      );
  
      logger.info("Get all movies request started", {
        theaterName,
        page,
        limit,
      });
  
      const theaterData = await TheaterService.getAllTheaterService({
        theaterName,
        page,
        limit,
      });
      logger.info("Get all movies completed successfully", {
        source: theaterData.source,
        totalMovies: theaterData.totalMovies,
      });
  
      
      return res.status(statuscode.OK).json({
        status: true,
        ...theaterData,
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

  async getTheaterById(req, res) {
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
        
  
        const theater = await Theater.findOne({
          _id: req.params.id,
          isDeleted: false,
        });
  
        if (!theater) {
          return res.status(404).json({
            status: false,
            message: "Theater not found",
          });
        }
  
        return res.status(200).json({
          status: true,
          message: "Movie fetched successfully",
          data: theater,
        });
      } catch (error) {

        logger.error("Get all movies controller failed", {
        message: error.message,
        stack: error.stack,
      });

        return res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }

  
  async updateTheater(req, res) {
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

    const {theaterName, location, numberOfScreens} = req.body;

    logger.info("Theater update request started", {
      theaterId: id,
    });

    // 4. Call update service
    const theaterdata = await TheaterService.updateTheaterService({
      id,theaterName, location, numberOfScreens
    });

    return res.status(statuscode.OK).json({
      status: true,
      message: "Theater updated successfully",
      data: theaterdata,
    });

  } catch (error) {
    logger.error("Update Theater controller failed", {
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

    logger.info("Theater delete request started", {
      theaterId: id,
      userId: req.user?._id,
    });
    const theater = await TheaterService.deleteTheaterService(id);

    return res.status(statuscode.OK).json({
      status: true,
      message: "Theater deleted successfully",
      data: theater,
    });

  } catch (error) {
    logger.error("Delete theater controller failed", {
      theaterId: req.params.id,
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
      await TheaterService.retrieveDeletedTheaterService(id);
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

    logger.info("Force delete theater request started", {
      theaterId: id,
      userId: req.user._id,
    });

    const theaterData =
      await TheaterService.forceDeleteMovieService(id);

    return res.status(statuscode.OK).json({
      status: true,
      message: "Movie permanently deleted successfully",
      data: theaterData,
    });
  } catch (error) {
    logger.error("Force delete movie controller failed", {
      theaterId: req.params.id,
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

async getTheatersByMovie(req, res) {
    try {
    const { movieId } = req.params;

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

    const theaters = await TheaterService.getTheatersByMovieService(movieId);

    return res.status(200).json({
      status: true,
      message: "Theaters fetched successfully",
      totalTheaters: theaters.length,
      data: theaters,
    });
  } catch (error) {
    logger.error("Get theaters by movie controller failed", {
      movieId: req.params.movieId,
      message: error.message,
      stack: error.stack,
    });

    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
  }


  // ASSIGN MOVIE TO THEATER SCREEN
  async assignMovie(req, res) {
  try {
    const {
      theaterId,
      screenNumber,
      movieId,
      showDate,
      showTime,
      totalSeats,
      ticketPrice,
    } = req.body;

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

    logger.info("Assign movie request started", {
      theaterId,
      movieId,
      screenNumber,
      userId: req.user?._id,
    });

    const theaterData = await TheaterService.assignMovieService({
      theaterId,
      screenNumber,
      movieId,
      showDate,
      showTime,
      totalSeats,
      ticketPrice,
    });

    return res.status(statuscode.CREATED).json({
      status: true,
      message: "Movie assigned to theater successfully",
      data: theaterData,
    });
  } catch (error) {
    logger.error("Assign movie controller failed", {
      theaterId: req.body?.theaterId,
      movieId: req.body?.movieId,
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

async assignMovieUpdate(req, res) {
    try {
      const { showId } = req.params;

      const {
        theaterId,
        screenNumber,
        movieId,
        showDate,
        showTime,
        totalSeats,
        ticketPrice,
      } = req.body;

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

      logger.info("Assign movie update request started", {
        showId,
        theaterId,
        screenNumber,
        userId: req.user?._id,
      });

      const updatedShow =
        await TheaterService.assignMovieUpdateService({
          showId,
          theaterId,
          screenNumber,
          movieId,
          showDate,
          showTime,
          totalSeats,
          ticketPrice,
        });

      return res.status(statuscode.OK).json({
        status: true,
        message: "Movie show updated successfully",
        data: updatedShow,
      });
    } catch (error) {
      logger.error("Assign movie update controller failed", {
        showId: req.params?.showId,
        theaterId: req.body?.theaterId,
        screenNumber: req.body?.screenNumber,
        message: error.message,
        stack: error.stack,
      });

      return res
        .status(
          error.statusCode || statuscode.SERVER_ERROR
        )
        .json({
          status: false,
          message: error.message,
        });
    }
  }

async getAllAssignMovie(req, res) {
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

    const { theaterName, movieName } = req.query;

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    logger.info("Get all assigned movies request started", {
      theaterName,
      movieName,
      page,
      limit,
    });

    const assignedMovieData =
      await TheaterService.getAllAssignMovieService({
        theaterName,
        movieName,
        page,
        limit,
      });

    logger.info("Get all assigned movies completed successfully", {
      source: assignedMovieData.source,
      totalAssignedMovies: assignedMovieData.totalAssignedMovies,
    });

    return res.status(statuscode.OK).json({
      status: true,
      message: "All assigned movies fetched successfully",
      ...assignedMovieData,
    });
  } catch (error) {
    logger.error("Get all assigned movies controller failed", {
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

async getAssignMovie(req, res) {
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

    const { showId } = req.params;

    const theater = await Theater.findOne({
      "screens.shows._id": showId,
      isDeleted: false,
    }).populate({
      path: "screens.shows.movieId",
      select: "name duration genre language poster description",
    });

    if (!theater) {
      return res.status(statuscode.NOT_FOUND).json({
        status: false,
        message: "Assigned movie not found",
      });
    }

    let assignedMovie = null;

    for (const screen of theater.screens) {
      const show = screen.shows.id(showId);

      if (show) {
        assignedMovie = {
          showId: show._id,
          theaterId: theater._id,
          theaterName: theater.theaterName,
          location: theater.location,
          screenNumber: screen.screenNumber,
          movie: show.movieId,
          showDate: show.showDate,
          showTime: show.showTime,
          totalSeats: show.totalSeats,
          availableSeats: show.availableSeats,
          ticketPrice: show.ticketPrice,
          status: show.status,
        };

        break;
      }
    }

    if (!assignedMovie) {
      return res.status(statuscode.NOT_FOUND).json({
        status: false,
        message: "Assigned movie not found",
      });
    }

    return res.status(statuscode.OK).json({
      status: true,
      message: "Assigned movie fetched successfully",
      data: assignedMovie,
    });

  } catch (error) {
    logger.error("Get assigned movie controller failed", {
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

async deleteAssignMovie(req, res) {
  try {
    const { showId } = req.params;
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

    logger.info("Assigned movie delete request started", {
      showId,
      userId: req.user._id,
    });

    const showData =
      await TheaterService.deleteAssignMovieService(showId);

    return res.status(statuscode.OK).json({
      status: true,
      message: "Assigned movie deleted successfully",
      data: showData,
    });
  } catch (error) {
    logger.error("Delete assigned movie controller failed", {
      showId: req.params.showId,
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

async retrieveDeletedAssignMovie(req, res) {
  try {
    const { showId } = req.params;
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

    logger.info("Retrieve deleted assigned movie request started", {
      showId,
      userId: req.user._id,
    });

    const showData =
      await TheaterService.retrieveDeletedAssignMovieService(showId);

    return res.status(statuscode.OK).json({
      status: true,
      message: "Assigned movie restored successfully",
      data: showData,
    });
  } catch (error) {
    logger.error("Retrieve deleted assigned movie controller failed", {
      showId: req.params.showId,
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

async forceDeleteAssignMovie(req, res) {
  try {
    const { showId } = req.params;
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

    logger.info("Force delete assigned movie request started", {
      showId,
      userId: req.user._id,
    });

    const showData =
      await TheaterService.forceDeleteAssignMovieService(showId);

    return res.status(statuscode.OK).json({
      status: true,
      message: "Assigned movie permanently deleted successfully",
      data: showData,
    });
  } catch (error) {
    logger.error("Force delete assigned movie controller failed", {
      showId: req.params.showId,
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

module.exports = new TheaterController();
