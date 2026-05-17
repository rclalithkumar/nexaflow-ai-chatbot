// -------------------- IMPORTS --------------------
const Chat = require("./models/Chat");
const Ticket = require("./models/Ticket");

const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// -------------------- GROQ --------------------
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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
    text.includes("track order") ||
    text.includes("order id") ||
    text.includes("track shipment") ||
    text.includes("delivery issue") ||
    text.includes("where is my order")
  ) {
    return "order";
  }

  if (
    text.includes("invoice") ||
    text.includes("payment") ||
    text.includes("refund") ||
    text.includes("billing") ||
    text.includes("subscription")
  ) {
    return "billing";
  }

  if (
    text.includes("error") ||
    text.includes("bug") ||
    text.includes("api") ||
    text.includes("not working") ||
    text.includes("technical issue")
  ) {
    return "technical";
  }

  return "general";
}

// -------------------- AI INTENT DETECTION --------------------
async function detectIntentAI(message) {
  try {
    const completion =
      await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",

        messages: [
          {
            role: "system",
            content: `
You are an enterprise intent classifier.

Classify ONLY into:
- order
- billing
- technical
- general

Return ONLY valid JSON.

Example:
{
  "intent": "general"
}
            `,
          },
          {
            role: "user",
            content: message,
          },
        ],
      });

    const raw =
      completion.choices[0]?.message?.content || "";

    try {
      return JSON.parse(raw);
    } catch {
      return {
        intent: detectIntent(message),
      };
    }

  } catch (err) {

    console.log(
      "Intent AI Failed → Using fallback"
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

    // ---------------- DETECT INTENT ----------------
    const intentData =
      await detectIntentAI(message);

    const intent =
      intentData.intent || "general";

    console.log("Intent:", intent);

    // ---------------- SYSTEM PROMPTS ----------------
    let systemPrompt = "";

    if (intent === "order") {

      systemPrompt = `
You are NexaFlow AI Order Support Assistant.

Responsibilities:
- Help users track orders
- Ask for order ID if missing
- Be professional and helpful
- Keep replies short
      `;

    } else if (intent === "billing") {

      systemPrompt = `
You are NexaFlow AI Billing Assistant.

Responsibilities:
- Handle invoices
- Refunds
- Subscription issues
- Payments

Be clear and professional.
      `;

    } else if (intent === "technical") {

      systemPrompt = `
You are NexaFlow AI Technical Support Engineer.

Responsibilities:
- Solve API issues
- Debug software
- Give step-by-step troubleshooting

Keep replies practical.
      `;

    } else {

      systemPrompt = `
You are NexaFlow AI Enterprise Assistant.

You help users with:
- SaaS
- CRM
- Cloud platforms
- Enterprise automation

Be modern and concise.

CRITICAL RULE: If the user asks about general, non-business, or non-enterprise topics (such as nature, trees, animals, hobbies, etc.), you MUST refuse to answer them directly. 

Instead, you must strictly redirect them back to business workflows using this exact tone and style:
"While I love nature, as the NexaFlow AI Enterprise Assistant, I am designed to help you optimize business workflows! 

If you want to talk about 'decision trees' in machine learning, cloud infrastructure branches, or how to automate your CRM platforms, let me know. Otherwise, how can I assist you with your enterprise operations today?"
      `;
    }

    // ---------------- AI RESPONSE ----------------
    const completion =
      await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",

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
      });

    let reply =
      completion.choices[0]?.message?.content ||
      "No AI response";

    // ---------------- SMART TICKET CREATION ----------------
    let createdTicket = null;

    const shouldCreateTicket =
      intent === "technical" ||
      message.toLowerCase().includes("problem") ||
      message.toLowerCase().includes("failed") ||
      message.toLowerCase().includes("urgent") ||
      message.toLowerCase().includes("not working");

    if (shouldCreateTicket) {

      const ticketId =
        "NX-" +
        Math.floor(
          100000 + Math.random() * 900000
        );

      createdTicket =
        await Ticket.create({
          ticketId,
          userMessage: message,
          intent,
          status: "open",
        });

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
      intent,
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