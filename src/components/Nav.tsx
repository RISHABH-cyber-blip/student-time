import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/timetable", label: "Timetable" },
  { href: "/tasks", label: "Tasks" },
  { href: "/assistant", label: "Assistant" },
];

export default function Nav({ session }: { session: Session | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(session?.user?.email ?? null);
  }, [session]);

  if (location.pathname === "/login") return null;

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <header className="flex items-center justify-between py-6">
      <div>
        <div className="font-display font-bold text-2xl tracking-wide">ORBIT</div>
        <div className="text-xs text-muted">your day, on a dial</div>
      </div>
      <nav className="hidden sm:flex gap-1 bg-surface rounded-full p-1">
        {links.map((l) => (
          <Link
            key={l.href}
            to={l.href}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              location.pathname === l.href ? "bg-amber text-ink" : "text-muted hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3 text-sm">
        {email && <span className="text-muted hidden md:inline">{email}</span>}
        {email ? (
          <button onClick={logout} className="text-coral">Log out</button>
        ) : (
          <Link to="/login" className="text-amber">Log in</Link>
        )}
      </div>
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex justify-around py-2 z-40">
        {links.map((l) => (
          <Link
            key={l.href}
            to={l.href}
            className={`text-xs px-2 py-1 rounded-lg ${location.pathname === l.href ? "text-amber" : "text-muted"}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
