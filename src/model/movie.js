
const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    genre: {
      type: [String],
      required: true,
    },

    language: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: Number,
      required: true, // Duration in minutes
    },

    cast: {
      type: [String],
      required: true,
    },

    director: {
      type: String,
      required: true,
      trim: true,
    },

    releaseDate: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    poster: {
      url: {
        type: String,
        default: "",
      },
      public_id: {
        type: String,
        default: "",
      },
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Movie", movieSchema);
