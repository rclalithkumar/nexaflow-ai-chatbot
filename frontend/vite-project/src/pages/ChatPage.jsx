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

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    setMessage(transcript);
  }, [transcript]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(
        "https://nexaflow-ai-chatbot.onrender.com/api/history"
      );

      const formattedMessages = [];

      response.data.reverse().forEach((chat, index) => {
        formattedMessages.push({
          id: `user-${index}`,
          sender: "user",
          text: chat.userMessage,
        });

        formattedMessages.push({
          id: `bot-${index}`,
          sender: "bot",
          text: chat.botReply,
        });
      });

      setMessages(formattedMessages);

    } catch (error) {
      console.log(error);
    }
  };

  const startListening = () => {
    resetTranscript();

    SpeechRecognition.startListening({
      continuous: false,
      language: "en-US",
    });
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const currentMessage = message;

    const uniqueId = Date.now();

    const userMessage = {
      id: `user-${uniqueId}`,
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

      const botMessage = {
        id: `bot-${uniqueId}`,
        sender: "bot",
        text: response.data.reply,
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
          id: `error-${uniqueId}`,
          sender: "bot",
          text: "Server error. Please try again.",
        },
      ]);
    }

    setLoading(false);
  };

  const scrollToMessage = (id) => {
    const element =
      document.getElementById(id);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="text-white p-10">
        Browser doesn't support speech recognition.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#020617] text-white overflow-hidden">

      <div className="w-full md:w-[320px] bg-[#0f172a]/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-cyan-500/20 flex flex-col">

        <div className="p-4 md:p-6 border-b border-cyan-500/20">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg">
              N
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
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

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">

          <h2 className="text-gray-400 text-xs md:text-sm uppercase tracking-wider mb-3">
            Recent Chats
          </h2>

          {messages
            .filter((msg) => msg.sender === "user")
            .map((msg, index) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                key={index}
                onClick={() =>
                  scrollToMessage(msg.id)
                }
                className="bg-[#111827] hover:bg-[#1e293b] transition p-3 md:p-4 rounded-2xl border border-cyan-500/10 cursor-pointer"
              >
                <p className="text-xs md:text-sm text-gray-300">
                  {msg.text.slice(0, 40)}...
                </p>
              </motion.div>
            ))}

        </div>

        <div className="p-4 border-t border-cyan-500/20 text-xs md:text-sm text-gray-400">
          AI Powered Enterprise Support
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">

        <div className="min-h-[80px] border-b border-cyan-500/20 bg-[#0f172a]/70 backdrop-blur-xl flex items-center justify-between px-4 md:px-8">

          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              NexaFlow AI Assistant
            </h2>

            <p className="text-gray-400 text-xs md:text-sm">
              AI CRM • Customer Support • Cloud Automation
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>

            <span className="text-xs md:text-sm text-gray-300">
              AI Online
            </span>

          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 md:px-8 py-4 md:py-6 space-y-6 bg-gradient-to-b from-[#020617] to-[#0f172a]">

          {messages.map((msg, index) => (
            <motion.div
              id={msg.id}
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
                className={`max-w-[90%] md:max-w-[70%] px-4 md:px-5 py-3 md:py-4 rounded-3xl shadow-lg whitespace-pre-line text-sm md:text-base ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "bg-[#111827] border border-cyan-500/20 text-gray-200"
                }`}
              >
                <p className="leading-relaxed break-words">
                  {msg.text}
                </p>
              </div>
            </motion.div>
          ))}

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

        <div className="p-3 md:p-6 border-t border-cyan-500/20 bg-[#0f172a]/80 backdrop-blur-xl">

          <div className="flex items-center gap-2 md:gap-4">

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
              className="flex-1 min-w-0 bg-[#111827] border border-cyan-500/20 focus:border-cyan-400 transition px-4 md:px-5 py-3 md:py-4 rounded-2xl outline-none text-white text-sm md:text-base"
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startListening}
              className="bg-[#111827] border border-cyan-500/30 w-[52px] h-[52px] md:w-[60px] md:h-[60px] rounded-2xl text-lg md:text-xl text-cyan-400 hover:bg-cyan-500/10 flex items-center justify-center shrink-0"
            >
              🎤
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={sendMessage}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 px-5 md:px-8 py-3 md:py-4 rounded-2xl font-semibold shadow-lg text-sm md:text-base shrink-0"
            >
              Send
            </motion.button>

          </div>

          {transcript && (
            <p className="text-cyan-400 mt-3 text-xs md:text-sm">
              Listening: {transcript}
            </p>
          )}

        </div>
      </div>
    </div>
  );
}