
const Joi = require("joi");

const objectId = Joi.string().hex().length(24);

const addTheaterSchema = Joi.object({
  theaterName: Joi.string().trim().min(2).required(),

  location: Joi.string().trim().required(),

  numberOfScreens: Joi.number().integer().min(1).required(),
});

const updateTheaterSchema = Joi.object({
  theaterName: Joi.string().trim().min(2).required(),

  location: Joi.string().trim().required(),

  numberOfScreens: Joi.number().integer().min(1).required(),
});

const assignMovieSchema = Joi.object({
  theaterId: objectId.required(),

  screenNumber: Joi.number().integer().min(1).required(),

  movieId: objectId.required(),

  showDate: Joi.date().iso().required(),

  showTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required(),

  totalSeats: Joi.number().integer().min(1).required(),

  ticketPrice: Joi.number().min(0).required(),
});

const assignMovieUpdateSchema = Joi.object({

  theaterId: objectId.required(),

  screenNumber: Joi.number()
    .integer()
    .min(1)
    .required(),

  movieId: objectId.optional(),

  showDate: Joi.date().iso().optional(),

  showTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),

  totalSeats: Joi.number()
    .integer()
    .min(1)
    .optional(),

  ticketPrice: Joi.number()
    .min(0)
    .optional(),
}).min(1);

const showIdSchema = Joi.object({
  showId: objectId.required(),
});

module.exports = {
  addTheaterSchema,
  assignMovieSchema,
  updateTheaterSchema,
  assignMovieUpdateSchema,
  showIdSchema
};
