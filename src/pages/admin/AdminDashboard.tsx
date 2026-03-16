import React, { useState, useEffect } from "react";
import { Users, Wrench, Activity } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTools: 0,
    totalUsage: 0,
    totalCreditsSpent: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: totalUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        const { count: totalTools } = await supabase
          .from("tools")
          .select("*", { count: "exact", head: true });

        const { count: totalUsage } = await supabase
          .from("tool_usage")
          .select("*", { count: "exact", head: true });

        const { data: usageData } = await supabase
          .from("tool_usage")
          .select("credits_spent");

        const totalCreditsSpent =
          usageData?.reduce((acc, curr) => acc + curr.credits_spent, 0) || 0;

        setStats({
          totalUsers: totalUsers || 0,
          totalTools: totalTools || 0,
          totalUsage: totalUsage || 0,
          totalCreditsSpent,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      name: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      name: "Total Tools",
      value: stats.totalTools,
      icon: Wrench,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      name: "Total Usage",
      value: stats.totalUsage,
      icon: Activity,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      name: "Credits Spent",
      value: stats.totalCreditsSpent,
      icon: () => <span className="text-xl">💳</span>,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">System analytics and quick stats.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm flex items-center"
          >
            <div className={`p-3 rounded-xl ${stat.bg} dark:bg-opacity-20 mr-4`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
