import React, { useState, useEffect } from "react";
import { Trophy, Medal, Crown, TrendingUp, Search, RefreshCw, AlertCircle, Shield } from "lucide-react";
import { supabase } from "../lib/supabase";
import { calculateExp, getRank } from "../lib/ranks";

type LeaderboardEntry = {
  username: string;
  age: number | null;
  total_spent: number;
  credit_balance: number;
  avatar_url: string | null;
};

type SortBy = "total_spent" | "credit_balance" | "exp";

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("total_spent");
  const [activeTab, setActiveTab] = useState<"main" | "exp">("main");

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy, activeTab]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch from the public view we created
      const orderColumn = activeTab === "exp" ? "total_spent" : sortBy;
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order(orderColumn, { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      console.error("Error fetching leaderboard:", err);
      setError(err.message || "Failed to load leaderboard data.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) =>
    entry.username.toLowerCase().includes(search.toLowerCase())
  );

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-slate-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-slate-400">#{index + 1}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            {activeTab === "main" ? "Leaderboard" : "EXP Leaderboard"}
            <Trophy className="w-6 h-6 ml-2 text-yellow-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === "main" 
              ? (sortBy === "total_spent" 
                ? "Top users ranked by total credits spent on tools."
                : "Top users ranked by their current credit balance.")
              : "Top users ranked by their experience points (EXP) and Rank."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Main Tabs */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("main")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "main"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Main
            </button>
            <button
              onClick={() => setActiveTab("exp")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "exp"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              EXP & Ranks
            </button>
          </div>

          {/* Filter Toggle (Only for Main Tab) */}
          {activeTab === "main" && (
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSortBy("total_spent")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  sortBy === "total_spent"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                Total Spent
              </button>
              <button
                onClick={() => setSortBy("credit_balance")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  sortBy === "credit_balance"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                Credit Balance
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Calculating rankings...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No rankings yet</h3>
            <p className="text-slate-500 dark:text-slate-400">
              {search ? `No users match "${search}"` : "Start using tools to appear on the leaderboard!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {activeTab === "exp" ? "EXP" : (sortBy === "total_spent" ? "Total Spent" : "Credit Balance")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEntries.map((entry, index) => (
                  <tr
                    key={entry.username}
                    className={`group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                      index < 3 ? "bg-indigo-50/30 dark:bg-indigo-900/10" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full">
                        {getRankIcon(index)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden mr-3">
                          <img
                            src={entry.avatar_url || `https://api.dicebear.com/7.x/lorelei/svg?seed=${entry.username}`}
                            alt={entry.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {entry.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(() => {
                        const exp = calculateExp(entry.total_spent);
                        const rank = getRank(exp);
                        return (
                          <div className="flex flex-col items-center">
                            <span className={`text-xs font-black uppercase tracking-tighter ${rank.color}`}>
                              {rank.name}
                            </span>
                            <span className="text-[8px] text-slate-400 font-bold uppercase">
                              {rank.category}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600 dark:text-slate-400">
                      {entry.age || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`flex items-center justify-end text-sm font-bold ${
                        activeTab === "exp" ? "text-amber-600 dark:text-amber-400" : (sortBy === "total_spent" ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400")
                      }`}>
                        {activeTab === "exp" ? (
                          <>
                            <span className="mr-1.5">✨</span>
                            {calculateExp(entry.total_spent).toLocaleString()}
                          </>
                        ) : (
                          <>
                            <span className="mr-1.5">💳</span>
                            {(sortBy === "total_spent" ? entry.total_spent : entry.credit_balance).toLocaleString()}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
