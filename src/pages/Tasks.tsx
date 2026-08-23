import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { findFreeSlot, addDays, dayOfWeekFromDate, diffMinutes, todayStr } from "@/lib/scheduling";
import type { Task, Profile, TimetableEvent } from "@/lib/types";

type Tab = "today" | "pending" | "later";

export default function Tasks() {
  const [tab, setTab] = useState<Tab>("today");
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [laterTasks, setLaterTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("30");
  const [profile, setProfile] = useState<Pick<Profile, "wake_time" | "sleep_time">>({ wake_time: "07:00", sleep_time: "23:00" });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const p = (prof as Profile) || profile;
    if (prof) setProfile(prof as Profile);
    await rolloverOverdue(p);
    await loadAll();
  }

  async function loadAll() {
    const { data: today } = await supabase.from("tasks").select("*").eq("task_date", todayStr()).neq("status", "later").order("start_time");
    const { data: pending } = await supabase.from("tasks").select("*").eq("status", "pending").lt("task_date", todayStr()).order("task_date");
    const { data: later } = await supabase.from("tasks").select("*").eq("status", "later").order("original_date", { ascending: false });
    setTodayTasks((today as Task[]) || []);
    setPendingTasks((pending as Task[]) || []);
    setLaterTasks((later as Task[]) || []);
  }

  async function rolloverOverdue(prof: Pick<Profile, "wake_time" | "sleep_time">) {
    const { data: overdue } = await supabase.from("tasks").select("*").eq("status", "pending").lt("task_date", todayStr());
    if (!overdue || !overdue.length) return;

    const dow = dayOfWeekFromDate(todayStr());
    const { data: classes } = await supabase.from("timetable_events").select("*").eq("day_of_week", dow);
    const { data: existingToday } = await supabase.from("tasks").select("*").eq("task_date", todayStr());

    let busy: { start_time: string | null; end_time: string | null }[] = [...((classes as TimetableEvent[]) || []), ...((existingToday as Task[]) || [])];
    for (const t of overdue as Task[]) {
      const dur = t.start_time && t.end_time ? diffMinutes(t.start_time, t.end_time) : 30;
      const slot = findFreeSlot(busy, dur, prof.wake_time, prof.sleep_time);
      if (slot) {
        await supabase.from("tasks").update({ task_date: todayStr(), start_time: slot.start, end_time: slot.end }).eq("id", t.id);
        busy.push(slot);
      }
    }
  }

  async function addTask() {
    if (!newTitle.trim() || !userId) return;
    const dow = dayOfWeekFromDate(todayStr());
    const { data: classes } = await supabase.from("timetable_events").select("*").eq("day_of_week", dow);
    const busy = [...((classes as TimetableEvent[]) || []), ...todayTasks];
    const slot = findFreeSlot(busy, Number(newDuration), profile.wake_time, profile.sleep_time);

    await supabase.from("tasks").insert({
      user_id: userId,
      title: newTitle.trim(),
      task_date: todayStr(),
      original_date: todayStr(),
      start_time: slot?.start || null,
      end_time: slot?.end || null,
      status: "pending",
    });
    setNewTitle("");
    loadAll();
  }

  async function markDone(id: string) {
    await supabase.from("tasks").update({ status: "done" }).eq("id", id);
    loadAll();
  }
  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    loadAll();
  }
  async function skipTask(task: Task) {
    const tomorrow = addDays(todayStr(), 1);
    const dow = dayOfWeekFromDate(tomorrow);
    const { data: classes } = await supabase.from("timetable_events").select("*").eq("day_of_week", dow);
    const { data: tomorrowTasks } = await supabase.from("tasks").select("*").eq("task_date", tomorrow);
    const dur = task.start_time && task.end_time ? diffMinutes(task.start_time, task.end_time) : 30;
    const slot = findFreeSlot([...((classes as TimetableEvent[]) || []), ...((tomorrowTasks as Task[]) || [])], dur, profile.wake_time, profile.sleep_time);
    await supabase.from("tasks").update({
      task_date: tomorrow,
      start_time: slot?.start || null,
      end_time: slot?.end || null,
      status: "pending",
    }).eq("id", task.id);
    loadAll();
  }
  async function shiftTask(task: Task) {
    const dow = dayOfWeekFromDate(todayStr());
    const { data: classes } = await supabase.from("timetable_events").select("*").eq("day_of_week", dow);
    const others = todayTasks.filter((t) => t.id !== task.id);
    const dur = task.start_time && task.end_time ? diffMinutes(task.start_time, task.end_time) : 30;
    const slot = findFreeSlot([...((classes as TimetableEvent[]) || []), ...others], dur, profile.wake_time, profile.sleep_time);
    if (slot) {
      await supabase.from("tasks").update({ start_time: slot.start, end_time: slot.end }).eq("id", task.id);
      loadAll();
    }
  }
  async function sendLater(id: string) {
    await supabase.from("tasks").update({ status: "later" }).eq("id", id);
    loadAll();
  }
  async function restoreFromLater(task: Task) {
    const dow = dayOfWeekFromDate(todayStr());
    const { data: classes } = await supabase.from("timetable_events").select("*").eq("day_of_week", dow);
    const slot = findFreeSlot([...((classes as TimetableEvent[]) || []), ...todayTasks], 30, profile.wake_time, profile.sleep_time);
    await supabase.from("tasks").update({
      status: "pending",
      task_date: todayStr(),
      start_time: slot?.start || null,
      end_time: slot?.end || null,
    }).eq("id", task.id);
    loadAll();
  }

  const list = tab === "today" ? todayTasks : tab === "pending" ? pendingTasks : laterTasks;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-display font-bold text-xl mb-4">Tasks</h1>

      <div className="flex gap-1 bg-surface rounded-full p-1 mb-5 w-fit">
        {(["today", "pending", "later"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${tab === t ? "bg-amber text-ink" : "text-muted"}`}
          >
            {t} {t === "pending" && pendingTasks.length > 0 && `(${pendingTasks.length})`}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <div className="bg-surface rounded-2xl p-4 mb-5 flex gap-2 flex-wrap">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Add a task…"
            className="flex-1 bg-surface2 border border-border rounded-xl px-3 py-2 text-sm min-w-[150px]"
          />
          <select value={newDuration} onChange={(e) => setNewDuration(e.target.value)} className="bg-surface2 border border-border rounded-xl px-2 py-2 text-sm">
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 hr</option>
            <option value="90">1.5 hr</option>
            <option value="120">2 hr</option>
          </select>
          <button onClick={addTask} className="bg-amber text-ink rounded-xl px-4 py-2 text-sm font-semibold">Add</button>
        </div>
      )}

      <AnimatePresence>
        {list.length === 0 && (
          <div className="text-muted text-sm italic">
            {tab === "today" && "Nothing scheduled yet."}
            {tab === "pending" && "Nothing overdue. Clean slate."}
            {tab === "later" && "No parked tasks."}
          </div>
        )}
        {list.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-surface2 rounded-xl px-4 py-3 mb-2"
          >
            <div className="flex items-center gap-3">
              {tab !== "later" && (
                <button
                  onClick={() => markDone(t.id)}
                  className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center text-xs ${t.status === "done" ? "bg-mint border-mint text-ink" : "border-border"}`}
                >
                  {t.status === "done" && "✓"}
                </button>
              )}
              <div className="flex-1">
                <div className={`text-sm ${t.status === "done" ? "line-through opacity-50" : ""}`}>{t.title}</div>
                {t.start_time && <div className="font-mono text-xs text-muted">{t.start_time} – {t.end_time}</div>}
                {tab === "pending" && <div className="text-xs text-coral">overdue from {t.task_date}</div>}
                {tab === "later" && <div className="text-xs text-muted">parked since {t.original_date}</div>}
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {tab === "today" && t.status !== "done" && (
                  <>
                    <button onClick={() => shiftTask(t)} className="text-xs bg-ink border border-border rounded-lg px-2 py-1">Shift</button>
                    <button onClick={() => skipTask(t)} className="text-xs bg-ink border border-border rounded-lg px-2 py-1">Skip</button>
                    <button onClick={() => sendLater(t.id)} className="text-xs bg-ink border border-border rounded-lg px-2 py-1">Later</button>
                  </>
                )}
                {tab === "pending" && (
                  <>
                    <button onClick={() => skipTask(t)} className="text-xs bg-ink border border-border rounded-lg px-2 py-1">Retry today</button>
                    <button onClick={() => sendLater(t.id)} className="text-xs bg-ink border border-border rounded-lg px-2 py-1">Later</button>
                  </>
                )}
                {tab === "later" && (
                  <button onClick={() => restoreFromLater(t)} className="text-xs bg-mint text-ink rounded-lg px-2 py-1 font-semibold">Restore</button>
                )}
                <button onClick={() => deleteTask(t.id)} className="text-xs text-muted px-1">✕</button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
