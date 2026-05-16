import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);

  // 🎤 Speech Recognition
  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // ---------------- FETCH HISTORY ----------------
  useEffect(() => {
    fetchHistory();
  }, []);

  // ---------------- AUTO SCROLL ----------------
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // 🎤 Put voice text into input
  useEffect(() => {
    setMessage(transcript);
  }, [transcript]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(
        "https://nexaflow-ai-chatbot.onrender.com/api/history"
      );

      const formattedMessages = [];

      response.data.reverse().forEach((chat) => {
        formattedMessages.push({
          sender: "user",
          text: chat.userMessage,
        });

        formattedMessages.push({
          sender: "bot",
          text: chat.botReply,
        });
      });

      setMessages(formattedMessages);

    } catch (error) {
      console.log(error);
    }
  };

  // 🎤 Start Voice
  const startListening = () => {
    resetTranscript();

    SpeechRecognition.startListening({
      continuous: false,
      language: "en-US",
    });
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = async () => {
    if (!message.trim()) return;

    const currentMessage = message;

    const userMessage = {
      sender: "user",
      text: currentMessage,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setMessage("");
    resetTranscript();
    setLoading(true);

    try {
      const response = await axios.post(
        "https://nexaflow-ai-chatbot.onrender.com/api/chat",
        {
          message: currentMessage,
        }
      );

      let botReply = response.data.reply;
      const botMessage = {
        sender: "bot",
        text: botReply,
      };

      setMessages((prev) => [
        ...prev,
        botMessage,
      ]);

    } catch (error) {
      console.log(error);

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Server error. Please try again.",
        },
      ]);
    }

    setLoading(false);
  };

  // 🎤 Browser Support
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="text-white p-10">
        Browser doesn't support speech recognition.
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-white overflow-hidden">

      {/* ---------------- SIDEBAR ---------------- */}
      <div className="w-[320px] bg-[#0f172a]/80 backdrop-blur-xl border-r border-cyan-500/20 flex flex-col">

        {/* Logo */}
        <div className="p-6 border-b border-cyan-500/20">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              N
            </div>

            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                NexaFlow AI
              </h1>

              <p className="text-xs text-gray-400">
                Enterprise Intelligence
              </p>
            </div>

          </div>

          <p className="text-gray-400 mt-2 text-sm">
            Smart CRM & Support Assistant
          </p>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-3">
            Recent Chats
          </h2>

          {messages
            .filter((msg) => msg.sender === "user")
            .map((msg, index) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                key={index}
                className="bg-[#111827] hover:bg-[#1e293b] transition p-4 rounded-2xl border border-cyan-500/10 cursor-pointer"
              >
                <p className="text-sm text-gray-300">
                  {msg.text.slice(0, 40)}...
                </p>
              </motion.div>
            ))}

        </div>

        {/* Bottom */}
        <div className="p-4 border-t border-cyan-500/20 text-sm text-gray-400">
          AI Powered Enterprise Support
        </div>
      </div>

      {/* ---------------- MAIN CHAT ---------------- */}
      <div className="flex-1 flex flex-col">

        {/* Top Navbar */}
        <div className="h-[80px] border-b border-cyan-500/20 bg-[#0f172a]/70 backdrop-blur-xl flex items-center justify-between px-8">

          <div>
            <h2 className="text-2xl font-bold">
              NexaFlow AI Assistant
            </h2>

            <p className="text-gray-400 text-sm">
              AI CRM • Customer Support • Cloud Automation
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>

            <span className="text-sm text-gray-300">
              AI Online
            </span>

          </div>
        </div>

        {/* ---------------- CHAT AREA ---------------- */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-gradient-to-b from-[#020617] to-[#0f172a]">

          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${
                msg.sender === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] px-5 py-4 rounded-3xl shadow-lg whitespace-pre-line ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "bg-[#111827] border border-cyan-500/20 text-gray-200"
                }`}
              >
                <p className="leading-relaxed">
                  {msg.text}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-[#111827] border border-cyan-500/20 px-5 py-4 rounded-3xl">

                <div className="flex gap-2">

                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>

                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></div>

                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></div>

                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef}></div>
        </div>

        {/* ---------------- INPUT ---------------- */}
        <div className="p-6 border-t border-cyan-500/20 bg-[#0f172a]/80 backdrop-blur-xl">

          <div className="flex items-center gap-4">

            {/* Input */}
            <input
              type="text"
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Ask about cloud, billing, orders, APIs..."
              className="flex-1 bg-[#111827] border border-cyan-500/20 focus:border-cyan-400 transition px-5 py-4 rounded-2xl outline-none text-white"
            />

            {/* 🎤 Voice Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startListening}
              className="bg-[#111827] border border-cyan-500/30 px-5 py-4 rounded-2xl text-xl"
            >
              🎤
            </motion.button>

            {/* Send Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={sendMessage}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 rounded-2xl font-semibold shadow-lg"
            >
              Send
            </motion.button>

          </div>

          {/* 🎤 Live Voice Text */}
          {transcript && (
            <p className="text-cyan-400 mt-3 text-sm">
              Listening: {transcript}
            </p>
          )}

        </div>
      </div>
    </div>
  );
}