import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import Nav from "@/components/Nav";
import AlarmWatcher from "@/components/AlarmWatcher";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Timetable from "@/pages/Timetable";
import Tasks from "@/pages/Tasks";
import Assistant from "@/pages/Assistant";

function ProtectedRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (session === undefined) return null; // still loading
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">
      {session && <AlarmWatcher />}
      <Nav session={session ?? null} />
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={<ProtectedRoute session={session ?? null}><Dashboard /></ProtectedRoute>} />
        <Route path="/timetable" element={<ProtectedRoute session={session ?? null}><Timetable /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute session={session ?? null}><Tasks /></ProtectedRoute>} />
        <Route path="/assistant" element={<ProtectedRoute session={session ?? null}><Assistant /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </div>
  );
}
