import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import type { TimetableEvent } from "@/lib/types";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const PALETTE = ["#F2A65A","#6FCF97","#7FB3F2","#E8735A","#C792EA","#5AD1C6"];

export default function Timetable() {
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ day_of_week: "1", start_time: "09:00", end_time: "09:55", subject: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("timetable_events").select("*").order("day_of_week").order("start_time");
    setEvents((data as TimetableEvent[]) || []);
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const base64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = () => rej(new Error("read failed"));
        r.readAsDataURL(file);
      });

      const { data: fnData, error: fnError } = await supabase.functions.invoke("parse-timetable", {
        body: { imageBase64: base64, mediaType: file.type },
      });
      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);

      const { data: { user } } = await supabase.auth.getUser();
      const rows = fnData.events.map((ev: any, i: number) => ({
        user_id: user!.id,
        day_of_week: ev.day_of_week,
        start_time: ev.start_time,
        end_time: ev.end_time,
        subject: ev.subject,
        color: PALETTE[i % PALETTE.length],
      }));
      const { error: insertError } = await supabase.from("timetable_events").insert(rows);
      if (insertError) throw insertError;
      await load();
    } catch (err: any) {
      setError(err.message || "Couldn't read that timetable.");
    } finally {
      setUploading(false);
    }
  }

  async function addManual(e: FormEvent) {
    e.preventDefault();
    if (!form.subject.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("timetable_events").insert({
      user_id: user!.id,
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      subject: form.subject.trim(),
      color: PALETTE[events.length % PALETTE.length],
    });
    setForm({ ...form, subject: "" });
    load();
  }

  async function deleteEvent(id: string) {
    await supabase.from("timetable_events").delete().eq("id", id);
    load();
  }

  const byDay = DAY_NAMES.map((name, idx) => ({
    name, idx, events: events.filter((e) => e.day_of_week === idx),
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-display font-bold text-xl mb-4">Timetable</h1>

      <div className="bg-surface rounded-2xl p-5 mb-6">
        <div className="font-display font-bold text-sm mb-3">Upload a photo</div>
        <label className="block text-center bg-amber text-ink rounded-xl py-3 font-semibold text-sm cursor-pointer">
          {uploading ? "Reading timetable…" : "Choose timetable photo"}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
        {error && <div className="text-coral text-xs mt-3">{error}</div>}
        <div className="text-xs text-muted mt-3">AI reads it and fills in every class — day, time, subject — automatically.</div>
      </div>

      <form onSubmit={addManual} className="bg-surface rounded-2xl p-5 mb-6 flex flex-col gap-3">
        <div className="font-display font-bold text-sm">Or add one manually</div>
        <select
          value={form.day_of_week}
          onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
          className="bg-surface2 border border-border rounded-xl px-3 py-2 text-sm"
        >
          {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            className="bg-surface2 border border-border rounded-xl px-3 py-2 text-sm flex-1" />
          <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            className="bg-surface2 border border-border rounded-xl px-3 py-2 text-sm flex-1" />
        </div>
        <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="bg-surface2 border border-border rounded-xl px-3 py-2 text-sm" />
        <button className="bg-surface2 border border-border rounded-xl py-2 text-sm font-semibold">Add class</button>
      </form>

      {byDay.filter((d) => d.events.length).map((d) => (
        <div key={d.idx} className="mb-5">
          <div className="text-amber font-display font-bold text-sm mb-2">{d.name}</div>
          {d.events.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 bg-surface2 rounded-lg px-3 py-2 mb-2" style={{ borderLeft: `3px solid ${ev.color}` }}>
              <span className="font-mono text-xs text-muted min-w-[90px]">{ev.start_time}–{ev.end_time}</span>
              <span className="text-sm flex-1">{ev.subject}</span>
              <button onClick={() => deleteEvent(ev.id)} className="text-muted text-xs">✕</button>
            </div>
          ))}
        </div>
      ))}
    </motion.div>
  );
}
