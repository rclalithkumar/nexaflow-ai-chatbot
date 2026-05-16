import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [stats, setStats] = useState({
    chats: 0,
    tickets: 0,
    intents: {},
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/analytics"
      );

      setStats(res.data);

    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-white p-8">

      <h1 className="text-4xl font-bold mb-8">
        NexusAI Analytics Dashboard
      </h1>

      <div className="grid grid-cols-3 gap-6">

        <div className="bg-[#111827] p-6 rounded-2xl">
          <h2 className="text-xl">Total Chats</h2>
          <p className="text-4xl font-bold mt-3">
            {stats.chats}
          </p>
        </div>

        <div className="bg-[#111827] p-6 rounded-2xl">
          <h2 className="text-xl">Support Tickets</h2>
          <p className="text-4xl font-bold mt-3">
            {stats.tickets}
          </p>
        </div>

        <div className="bg-[#111827] p-6 rounded-2xl">
          <h2 className="text-xl">Top Intent</h2>

          <p className="text-2xl mt-3">
            {Object.keys(stats.intents)[0] || "general"}
          </p>
        </div>

      </div>
    </div>
  );
}