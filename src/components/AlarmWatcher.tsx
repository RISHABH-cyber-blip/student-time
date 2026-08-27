import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayStr } from "@/lib/scheduling";
import AlarmRingModal, { RingingItem } from "./AlarmRingModal";
import { getAudioContext, isUnlocked } from "@/lib/audioUnlock";

function dow(): number {
    return new Date().getDay();
}

export default function AlarmWatcher() {
    const [ringing, setRinging] = useState<RingingItem | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const beepIntervalRef = useRef<number | null>(null);

    function startRingtone() {
        if (!isUnlocked()) return; // can't play sound until the user has tapped Enable once
        const ctx = getAudioContext();
        function beep() {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 880;
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        }
        beep();
        beepIntervalRef.current = window.setInterval(beep, 700);
    }

    function stopRingtone() {
        if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    }

    useEffect(() => {
        const interval = setInterval(async () => {
            if (ringing) return; // already ringing something, wait for user action
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const now = new Date();
            const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

            const { data: classes } = await supabase
                .from("timetable_events").select("*")
                .eq("day_of_week", dow()).eq("start_time", hhmm).eq("alarm_enabled", true);
            const { data: tasks } = await supabase
                .from("tasks").select("*")
                .eq("task_date", todayStr()).eq("start_time", hhmm)
                .eq("status", "pending").eq("alarm_enabled", true);

            if (classes && classes.length > 0) {
                setRinging({ id: classes[0].id, kind: "class", label: classes[0].subject });
            } else if (tasks && tasks.length > 0) {
                setRinging({ id: tasks[0].id, kind: "task", label: tasks[0].title });
            }
        }, 15000);
        return () => clearInterval(interval);
    }, [ringing]);

    useEffect(() => {
        if (ringing) startRingtone();
        return () => stopRingtone();
    }, [ringing]);

    async function handleTick() {
        if (!ringing) return;
        await supabase.from("tasks").update({ status: "done" }).eq("id", ringing.id);
        setRinging(null);
    }
    async function handleReject() {
        if (!ringing) return;
        await supabase.from("tasks").update({ status: "rejected" }).eq("id", ringing.id);
        setRinging(null);
    }
    function handleDismiss() {
        setRinging(null);
    }

    if (!ringing) return null;
    return <AlarmRingModal item={ringing} onTick={handleTick} onReject={handleReject} onDismiss={handleDismiss} />;
}