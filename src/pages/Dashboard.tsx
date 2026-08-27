import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DayDial from "@/components/DayDial";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { todayStr } from "@/lib/scheduling";
import type { TimetableEvent } from "@/lib/types";

function dayOfWeek(d: string): number {
  return new Date(d + "T00:00:00").getDay();
}

interface DayStat { date: string; completed: number; total: number; rate: number; rejected?: number; }

export default function Dashboard() {
  const [todayEvents, setTodayEvents] = useState<TimetableEvent[]>([]);
  const [weekStats, setWeekStats] = useState<DayStat[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [suggestion, setSuggestion] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: events } = await supabase.from("timetable_events").select("*").eq("day_of_week", dayOfWeek(todayStr()));
    setTodayEvents((events as TimetableEvent[]) || []);

    const { count } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "pending").lt("task_date", todayStr());
    setPendingCount(count || 0);

    const since = new Date(); since.setDate(since.getDate() - 13);
    const sinceStr = since.toISOString().slice(0, 10);
    const { data: recentTasks } = await supabase.from("tasks").select("task_date,status").gte("task_date", sinceStr).lte("task_date", todayStr());

    const byDate: Record<string, { total: number; done: number; rejected: number }> = {};
    (recentTasks || []).forEach((t: any) => {
      byDate[t.task_date] = byDate[t.task_date] || { total: 0, done: 0, rejected: 0 };
      byDate[t.task_date].total += 1;
      if (t.status === "done") byDate[t.task_date].done += 1;
      if (t.status === "rejected") byDate[t.task_date].rejected += 1;
    });
    const days: DayStat[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const stat = byDate[key] || { total: 0, done: 0, rejected: 0 };
      days.push({
        date: key.slice(5),
        completed: stat.done,
        total: stat.total,
        rate: stat.total ? Math.round((stat.done / stat.total) * 100) : 0,
        rejected: stat.rejected,
      });
    }
    setWeekStats(days);

    if ((count || 0) > 2) {
      setSuggestion(`You have ${count} overdue tasks piling up. Consider parking the low-priority ones in "Later" so today doesn't get buried.`);
    } else if (days.slice(-3).every((d) => d.rate >= 70)) {
      setSuggestion("3-day streak of solid completion. Good pace to keep.");
    } else {
      setSuggestion("");
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-display font-bold text-xl mb-4">Dashboard</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <DayDial events={todayEvents.map(e => ({ id: e.id, start_time: e.start_time, end_time: e.end_time, subject: e.subject, color: e.color }))} />
        <div className="flex flex-col gap-4 flex-1 min-w-[260px]">
          <div className="bg-surface rounded-2xl p-5">
            <div className="text-xs text-muted mb-1">Overdue tasks</div>
            <div className="font-display font-bold text-3xl">{pendingCount}</div>
          </div>
          {suggestion && (
            <div className="bg-surface rounded-2xl p-5 border border-amber/30">
              <div className="text-xs text-amber font-semibold mb-1">Suggestion</div>
              <div className="text-sm text-muted">{suggestion}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-5 mb-6">
        <div className="font-display font-bold text-sm mb-3">Completion rate — last 14 days</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weekStats}>
            <CartesianGrid stroke="#2A2F42" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#8B8FA3" fontSize={11} />
            <YAxis stroke="#8B8FA3" fontSize={11} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "#1E2230", border: "1px solid #2A2F42", borderRadius: 8 }} />
            <Line type="monotone" dataKey="rate" stroke="#F2A65A" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface rounded-2xl p-5">
        <div className="font-display font-bold text-sm mb-3">Tasks per day</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekStats}>
            <CartesianGrid stroke="#2A2F42" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#8B8FA3" fontSize={11} />
            <YAxis stroke="#8B8FA3" fontSize={11} />
            <Tooltip contentStyle={{ background: "#1E2230", border: "1px solid #2A2F42", borderRadius: 8 }} />
            <Bar dataKey="completed" stackId="a" fill="#6FCF97" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
