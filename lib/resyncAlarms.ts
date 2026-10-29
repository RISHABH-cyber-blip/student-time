import { Platform } from "react-native";
import { supabase } from "./supabaseClient";
import { scheduleClassAlarm, scheduleTaskAlarm, cancelAllAlarms } from "./notifications";
import { todayStr } from "./scheduling";

export async function resyncAlarms() {
  if (Platform.OS === "web") {
    // Scheduled notifications are native to iOS & Android. Skip on web preview.
    return;
  }

  await cancelAllAlarms();

  const { data: classes } = await supabase
    .from("timetable_events")
    .select("*")
    .eq("alarm_enabled", true);

  for (const c of classes ?? []) {
    try {
      const id = await scheduleClassAlarm(c.day_of_week, c.start_time, c.subject);
      if (id) {
        await supabase.from("timetable_events").update({ notif_id: id }).eq("id", c.id);
      }
    } catch (e) {
      console.error("Class alarm failed:", c.subject, e);
    }
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("alarm_enabled", true)
    .eq("status", "pending")
    .gte("task_date", todayStr())
    .not("start_time", "is", null);

  for (const t of tasks ?? []) {
    try {
      const id = await scheduleTaskAlarm(t.task_date, t.start_time, t.title);
      if (id) {
        await supabase.from("tasks").update({ notif_id: id }).eq("id", t.id);
      }
    } catch (e) {
      console.error("Task alarm failed:", t.title, e);
    }
  }
}
