
const express = require("express");
const router = express.Router();

const TheaterController = require("../../controller/Apis/TheaterController");

const Validation = require("../../validation/index");

const {
  addTheaterSchema,
  assignMovieSchema,
  updateTheaterSchema,
  assignMovieUpdateSchema,
  showIdSchema
} = require("../../validation/TheaterValidation");

const AuthMiddleware = require("../../middleware/AuthMiddleware");
const roleMiddleware = require("../../middleware/roleMiddleware");


router.post(
  "/addTheater",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  Validation.validate(addTheaterSchema),
  TheaterController.addTheater
);

router.get(
  "/getAllTheater",
  AuthMiddleware.verifyToken,
  TheaterController.getAllTheaters
);

router.get(
  "/getTheaterById/:id",
  AuthMiddleware.verifyToken,
  TheaterController.getTheaterById
);

router.put(
  "/updatetheater/:id",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  Validation.validate(updateTheaterSchema),
  TheaterController.updateTheater
);

router.delete(
  "/softdeletetheater/:id",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  TheaterController.deleteMovie
);

router.patch(
  "/retrivedeletetheater/:id",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  TheaterController.retrieveDeletedMovie
);

router.delete(
  "/forcedeletetheater/:id",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  TheaterController.forceDeleteMovie
);

router.get(
  "/movie/:movieId/theaters",
  AuthMiddleware.verifyToken,
  TheaterController.getTheatersByMovie
);


router.post(
  "/assign-movie",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  Validation.validate(assignMovieSchema),
  TheaterController.assignMovie
);

router.patch(
  "/assignMovieUpdate/:showId",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  Validation.validate(showIdSchema, "params"),
  Validation.validate(assignMovieUpdateSchema),
  TheaterController.assignMovieUpdate
);

router.get(
  "/getAllAssignMovie",
  AuthMiddleware.verifyToken,
  TheaterController.getAllAssignMovie
);

router.get(
  "/getAssignMovie/:showId",
  AuthMiddleware.verifyToken,
  TheaterController.getAssignMovie
);


router.delete(
  "/deleteAssignMovie/:showId",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  TheaterController.deleteAssignMovie,
);


router.patch(
  "/retrieveDeletedAssignMovie/:showId",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  TheaterController.retrieveDeletedAssignMovie,
);


router.delete(
  "/forceDeleteAssignMovie/:showId",
  AuthMiddleware.verifyToken,
  roleMiddleware("admin"),
  TheaterController.forceDeleteAssignMovie,
);

module.exports = router;
