import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { todayStr } from "@/lib/scheduling";

interface ChatMessage { role: "user" | "assistant"; text: string; }

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hi — I can see your timetable and tasks. Ask me to help plan today, decide what to cut, or point you toward something worth reading." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const { data: todayTasks } = await supabase.from("tasks").select("title,status,start_time,end_time").eq("task_date", todayStr());
      const { data: pending } = await supabase.from("tasks").select("title,task_date").eq("status", "pending").lt("task_date", todayStr());
      const dow = new Date().getDay();
      const { data: classes } = await supabase.from("timetable_events").select("subject,start_time,end_time").eq("day_of_week", dow);

      const context = {
        goals: profile?.goals || "not set",
        field: profile?.field_of_study || "not set",
        wake: profile?.wake_time, sleep: profile?.sleep_time,
        todays_classes: classes,
        todays_tasks: todayTasks,
        overdue_tasks: pending,
      };

      const { data, error } = await supabase.functions.invoke("assistant", {
        body: { message: userMsg, context },
      });
      if (error) throw error;
      setMessages((m) => [...m, { role: "assistant", text: data?.reply || data?.error || "No response." }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong reaching the assistant." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[75vh]">
      <h1 className="font-display font-bold text-xl mb-4">Assistant</h1>
      <div className="flex-1 overflow-y-auto bg-surface rounded-2xl p-4 mb-3 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${m.role === "user" ? "bg-amber text-ink self-end" : "bg-surface2 self-start"}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="text-muted text-xs">thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about today, your goals, what to cut…"
          className="flex-1 bg-surface2 border border-border rounded-xl px-4 py-3 text-sm"
        />
        <button onClick={send} className="bg-amber text-ink rounded-xl px-5 font-semibold text-sm">Send</button>
      </div>
    </motion.div>
  );
}
