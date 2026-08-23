import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayStr } from "@/lib/scheduling";

function dow(): number {
  return new Date().getDay();
}

export default function AlarmWatcher() {
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();

    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const { data: classes } = await supabase
        .from("timetable_events")
        .select("*")
        .eq("day_of_week", dow())
        .eq("start_time", hhmm);
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("task_date", todayStr())
        .eq("start_time", hhmm)
        .eq("status", "pending");

      const items = [
        ...(classes || []).map((c: any) => ({ id: "c-" + c.id, label: c.subject })),
        ...(tasks || []).map((t: any) => ({ id: "t-" + t.id, label: t.title })),
      ];

      items.forEach((item) => {
        const key = item.id + todayStr();
        if (!fired.current.has(key) && Notification.permission === "granted") {
          fired.current.add(key);
          new Notification("Orbit", { body: `Starting now — ${item.label}` });
        }
      });
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
