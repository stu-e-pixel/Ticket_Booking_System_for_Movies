
const mongoose = require("mongoose");

const showSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },

    showDate: {
      type: Date,
      required: true,
    },

    showTime: {
      type: String,
      required: true,
    },

    totalSeats: {
      type: Number,
      required: true,
    },

    availableSeats: {
      type: Number,
      required: true,
    },

    ticketPrice: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "cancelled", "completed"],
      default: "active",
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

const screenSchema = new mongoose.Schema(
  {
    screenNumber: {
      type: Number,
      required: true,
    },

    shows: [showSchema],
  }
);

const theaterSchema = new mongoose.Schema(
  {
    theaterName: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
    },

    numberOfScreens: {
      type: Number,
      required: true,
    },

    screens: [screenSchema],

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Theater", theaterSchema);
