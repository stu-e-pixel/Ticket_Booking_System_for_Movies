const express = require("express");
const router = express.Router();

const MovieController = require("../../controller/Apis/MovieController");

const Validation = require("../../validation/index");

const {
  addMovieSchema,
  updateMovieSchema,
  movieIdSchema,
} = require("../../validation/MovieValidation");

const AuthMiddleware = require("../../middleware/AuthMiddleware");
const roleMiddleware = require("../../middleware/roleMiddleware");
const upload = require('../../utils/mullter')

router.get("/getAllMovie",AuthMiddleware.verifyToken, MovieController.getAllMovies);

router.get(
  "/getMovieById/:id",
  
  AuthMiddleware.verifyToken,
  Validation.validate(movieIdSchema, "params"),
  MovieController.getMovieById,
);


router.post(
  "/addMovie",
  upload.single('poster'),
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  Validation.validate(addMovieSchema),
  MovieController.addMovie,
);


router.put(
  "/updateMovie/:id",
  upload.single('poster'),
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  Validation.validate(movieIdSchema, "params"),
  Validation.validate(updateMovieSchema),
  MovieController.updateMovie,
);


router.delete(
  "/softdeletmovie/:id",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  Validation.validate(movieIdSchema, "params"),
  MovieController.deleteMovie,
);

router.patch(
  "/retrieveDeletedMovie/:id",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  Validation.validate(movieIdSchema, "params"),
  MovieController.retrieveDeletedMovie
);

router.delete(
  "/forceDeleteMovie/:id",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  Validation.validate(movieIdSchema, "params"),
  MovieController.forceDeleteMovie
);

module.exports = router;
