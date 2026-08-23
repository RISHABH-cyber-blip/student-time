import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="bg-surface rounded-2xl p-8 w-full max-w-sm"
      >
        <div className="font-display font-bold text-2xl mb-1">ORBIT</div>
        <div className="text-muted text-sm mb-6">{mode === "login" ? "Welcome back." : "Create your account."}</div>
        <input
          type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 mb-3 text-sm"
        />
        <input
          type="password" required placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 mb-4 text-sm"
        />
        {error && <div className="text-coral text-xs mb-3">{error}</div>}
        <button disabled={loading} className="w-full bg-amber text-ink font-semibold rounded-xl py-3 text-sm mb-3">
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
        <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full text-muted text-xs">
          {mode === "login" ? "No account? Sign up" : "Already have an account? Log in"}
        </button>
      </motion.form>
    </div>
  );
}
