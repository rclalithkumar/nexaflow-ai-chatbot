const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: String,

    userMessage: String,

    intent: String,

    status: {
      type: String,
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model("Ticket", ticketSchema);