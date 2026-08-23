import { useEffect, useState } from "react";

const PALETTE = ["#F2A65A","#6FCF97","#7FB3F2","#E8735A","#C792EA","#5AD1C6"];
const DIAL_START = 360, DIAL_END = 1380, DEG_START = -135, DEG_RANGE = 270;

export interface DialEvent {
  id: string;
  start_time: string;
  end_time: string;
  subject?: string;
  title?: string;
  color?: string;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function angleFor(mins: number): number {
  const c = Math.min(Math.max(mins, DIAL_START), DIAL_END);
  return DEG_START + ((c - DIAL_START) / (DIAL_END - DIAL_START)) * DEG_RANGE;
}
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const s = polar(cx, cy, r, a0), e = polar(cx, cy, r, a1);
  const large = ((a1 - a0) % 360) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function DayDial({ events = [] }: { events: DialEvent[] }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const sorted = [...events].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  const current = sorted.find((c) => toMinutes(c.start_time) <= nowMin && nowMin < toMinutes(c.end_time));
  const next = sorted.find((c) => toMinutes(c.start_time) > nowMin);

  const cx = 150, cy = 150, r = 118;
  const needleAngle = angleFor(now.getHours() * 60 + now.getMinutes());
  const tip = polar(cx, cy, r - 6, needleAngle);

  function countdown(target: DialEvent): string {
    const diffSec = Math.max(0, toMinutes(target.start_time) - nowMin) * 60;
    const h = Math.floor(diffSec / 3600), m = Math.floor((diffSec % 3600) / 60), s = Math.floor(diffSec % 60);
    return `${h > 0 ? h + "h " : ""}${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }

  return (
    <div className="relative bg-surface rounded-2xl p-4 flex items-center justify-center flex-1 min-w-[280px]">
      <svg width="300" height="300" viewBox="0 0 300 300">
        <path d={arcPath(cx, cy, r, DEG_START, DEG_START + DEG_RANGE)} stroke="#2A2F42" strokeWidth={14} fill="none" strokeLinecap="round" />
        {sorted.map((c, i) => {
          const a0 = angleFor(toMinutes(c.start_time)), a1 = angleFor(toMinutes(c.end_time));
          return (
            <path
              key={c.id || i}
              d={arcPath(cx, cy, r, a0, a1)}
              stroke={c.color || PALETTE[i % PALETTE.length]}
              strokeWidth={14}
              fill="none"
              strokeLinecap="round"
              opacity={current && current.id === c.id ? 1 : 0.75}
            />
          );
        })}
        {[6, 9, 12, 15, 18, 21, 23].map((h) => {
          const p = polar(cx, cy, r + 22, angleFor(h * 60));
          return (
            <text key={h} x={p.x} y={p.y} fill="#6B7089" fontSize={10} fontFamily="JetBrains Mono, monospace" textAnchor="middle">
              {h}
            </text>
          );
        })}
        <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="#F2A65A" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="#F2A65A" />
      </svg>
      <div className="absolute text-center">
        {current ? (
          <>
            <div className="text-xs tracking-widest text-muted font-semibold">NOW</div>
            <div className="font-display font-bold text-lg max-w-[170px]">{current.subject || current.title}</div>
            <div className="font-mono text-xs text-muted">{current.start_time}–{current.end_time}</div>
          </>
        ) : next ? (
          <>
            <div className="text-xs tracking-widest text-muted font-semibold">NEXT UP</div>
            <div className="font-display font-bold text-lg max-w-[170px]">{next.subject || next.title}</div>
            <div className="font-mono text-sm text-amber font-semibold">{countdown(next)}</div>
          </>
        ) : (
          <div className="text-xs tracking-widest text-muted font-semibold">
            {sorted.length ? "DONE FOR TODAY" : "NOTHING SCHEDULED"}
          </div>
        )}
      </div>
    </div>
  );
}
