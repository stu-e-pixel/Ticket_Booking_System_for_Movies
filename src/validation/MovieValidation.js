
const joi = require("joi");

const objectId = joi.string().hex().length(24);

const addMovieSchema = joi.object({
  name: joi.string().trim().min(2).max(150).required(),

  genre: joi.string().custom((value, helpers) => {
    const genres = value.split(",").map(item => item.trim());

    if (genres.some(item => !item)) {
      return helpers.error("any.invalid");
    }

    return genres;
  }).required(),

  language: joi.string().trim().required(),

  duration: joi.number().integer().min(1).required(),

  cast: joi.string().custom((value, helpers) => {
    const actors = value.split(",").map(item => item.trim());

    if (actors.some(item => !item)) {
      return helpers.error("any.invalid");
    }

    return actors;
  }).required(),

  director: joi.string().trim().required(),

  releaseDate: joi.date().iso().required(),

  description: joi.string().allow("").optional(),
});

const updateMovieSchema = joi.object({
  name: joi.string().trim().min(2).max(150),

  genre: joi.string().custom((value, helpers) => {
    const genres = value.split(",").map(item => item.trim());

    if (genres.some(item => !item)) {
      return helpers.error("any.invalid");
    }

    return genres;
  }).required(),

  language: joi.string(),

  duration: joi.number().integer().min(1),

  cast: joi.string().custom((value, helpers) => {
    const actors = value.split(",").map(item => item.trim());

    if (actors.some(item => !item)) {
      return helpers.error("any.invalid");
    }

    return actors;
  }).required(),

  director: joi.string(),

  releaseDate: joi.date().iso(),

  description: joi.string().allow(""),
}).min(1);

const movieIdSchema = joi.object({
  id: objectId.required(),
});

module.exports = {
  addMovieSchema,
  updateMovieSchema,
  movieIdSchema,
};
