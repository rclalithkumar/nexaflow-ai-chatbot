// -------------------- IMPORTS --------------------
const Chat = require("./models/Chat");
const Ticket = require("./models/Ticket");

const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const axios = require("axios");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// -------------------- MONGODB --------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// -------------------- HEALTH CHECK --------------------
app.get("/", (req, res) => {
  res.send("NexaFlow AI Backend Running");
});

// -------------------- FALLBACK INTENT --------------------
function detectIntent(message) {
  const text = message.toLowerCase();

  if (
    text.includes("order") ||
    text.includes("track") ||
    text.includes("delivery") ||
    text.includes("where is my")
  ) {
    return "order";
  }

  if (
    text.includes("price") ||
    text.includes("billing") ||
    text.includes("invoice") ||
    text.includes("payment") ||
    text.includes("subscription")
  ) {
    return "billing";
  }

  if (
    text.includes("error") ||
    text.includes("bug") ||
    text.includes("not working") ||
    text.includes("issue") ||
    text.includes("api")
  ) {
    return "technical";
  }

  return "general";
}

// -------------------- AI INTENT DETECTION --------------------
async function detectIntentAI(message) {
  try {
    const response = await axios.post(
      "http://localhost:11434/api/chat",
      {
        model: "llama3.2:1b",

        messages: [
          {
            role: "system",
            content: `
You are an intent classification system.

Classify the message into ONLY JSON.

Possible intents:
- order
- billing
- technical
- general

Rules:
- order id, tracking, shipment -> order
- invoice, payment, refund -> billing
- error, bug, api issue -> technical
- everything else -> general

Return ONLY valid JSON:

{
  "intent":"order"
}
            `,
          },
          {
            role: "user",
            content: message,
          },
        ],

        stream: false,
      }
    );

    const raw =
      response.data?.message?.content || "";

    try {
      return JSON.parse(raw);
    } catch {
      return {
        intent: detectIntent(message),
      };
    }

  } catch (err) {
    console.log(
      "Intent AI Error:",
      err.message
    );

    return {
      intent: detectIntent(message),
    };
  }
}

// -------------------- CHAT API --------------------
app.post("/api/chat", async (req, res) => {
  try {

    const { message } = req.body;

    // ---------------- AI INTENT ----------------
    const intentData =
      await detectIntentAI(message);

    const intent =
      intentData.intent || "general";

    console.log("AI Intent:", intent);

    // ---------------- SYSTEM PROMPTS ----------------
    let systemPrompt = "";

    if (intent === "order") {

      systemPrompt = `
You are NexaFlow AI Order Support Assistant.

Responsibilities:
- Help users track orders
- Ask for order ID if missing
- Be professional and conversational
- Reply in user's language

Keep replies short and helpful.
      `;

    } else if (intent === "billing") {

      systemPrompt = `
You are NexaFlow AI Billing Assistant.

Responsibilities:
- Handle invoices
- Payments
- Refunds
- Subscription plans

Be professional and clear.
      `;

    } else if (intent === "technical") {

      systemPrompt = `
You are NexaFlow AI Technical Engineer.

Responsibilities:
- Debug software issues
- Solve API problems
- Guide step-by-step

Use numbered troubleshooting steps.
      `;

    } else {

      systemPrompt = `
You are NexaFlow AI Enterprise Assistant.

You help users with:
- SaaS
- Cloud computing
- CRM systems
- Enterprise support

Be smart, modern, and concise.
      `;
    }

    // ---------------- AI RESPONSE ----------------
    const response = await axios.post(
      "http://localhost:11434/api/chat",
      {
        model: "llama3.2:1b",

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],

        stream: false,
      }
    );

    let reply =
      response.data?.message?.content ||
      response.data?.response ||
      "No response from AI";

    // ---------------- AUTO TICKET SYSTEM ----------------
    let createdTicket = null;

    if (
      intent === "order" ||
      intent === "technical"
    ) {

      // 🎫 Generate Ticket ID
      const ticketId =
        "NX-" +
        Math.floor(
          100000 + Math.random() * 900000
        );

      // 🎫 Save Ticket in MongoDB
      createdTicket =
        await Ticket.create({
          ticketId: ticketId,
          userMessage: message,
          intent: intent,
          status: "open",
        });

      // 🎫 Append Ticket Info to AI Reply
      reply += `

━━━━━━━━━━━━━━━━━━
🎫 Support Ticket Created
Ticket ID: ${ticketId}
Status: OPEN
━━━━━━━━━━━━━━━━━━`;
    }

    // ---------------- SAVE CHAT ----------------
    await Chat.create({
      userMessage: message,
      botReply: reply,
      intent: intent,
      ticketId:
        createdTicket?.ticketId || null,
    });

    // ---------------- RESPONSE ----------------
    res.json({
      reply,
      intent,
      ticketId:
        createdTicket?.ticketId || null,
    });

  } catch (error) {

    console.log(
      "SERVER ERROR:",
      error.message
    );

    res.status(500).json({
      error: "AI Server Error",
    });
  }
});

// -------------------- HISTORY --------------------
app.get("/api/history", async (req, res) => {
  try {

    const chats =
      await Chat.find().sort({
        createdAt: -1,
      });

    res.json(chats);

  } catch (error) {

    res.status(500).json({
      error: "Error fetching history",
    });
  }
});

// -------------------- ANALYTICS --------------------
app.get("/api/analytics", async (req, res) => {
  try {

    const totalChats =
      await Chat.countDocuments();

    const totalTickets =
      await Ticket.countDocuments();

    const openTickets =
      await Ticket.countDocuments({
        status: "open",
      });

    const chats = await Chat.find();

    const intents = {};

    chats.forEach((chat) => {

      const intent =
        chat.intent || "general";

      intents[intent] =
        (intents[intent] || 0) + 1;
    });

    res.json({
      totalChats,
      totalTickets,
      openTickets,
      intents,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Analytics Error",
    });
  }
});

// -------------------- GET ALL TICKETS --------------------
app.get("/api/tickets", async (req, res) => {
  try {

    const tickets =
      await Ticket.find().sort({
        createdAt: -1,
      });

    res.json(tickets);

  } catch (error) {

    res.status(500).json({
      error: "Error fetching tickets",
    });
  }
});

// -------------------- SERVER --------------------
const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});