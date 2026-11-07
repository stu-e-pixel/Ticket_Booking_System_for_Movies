
const Joi = require("joi");

const objectId = Joi.string().hex().length(24);

const bookTicketSchema = Joi.object({
  movieId: objectId.required(),

  theaterId: objectId.required(),

  showId: objectId.required(),

  numberOfTickets: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required(),
});

const bookingIdSchema = Joi.object({
  id: objectId.required(),
});

module.exports = {
  bookTicketSchema,
  bookingIdSchema,
};
