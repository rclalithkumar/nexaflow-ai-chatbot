const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    userMessage: String,

    botReply: String,

    intent: String,

    ticketId: String,
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model("Chat", chatSchema);