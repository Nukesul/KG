import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation() as any;

  const [email, setEmail] = useState("Nursutanmusa007@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/admin", { replace: true });
    });
  }, [nav]);

  const login = async () => {
    setErr("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const to = location?.state?.from || "/admin";
      nav(to, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h2>Login</h2>
      <p style={{ opacity: 0.8 }}>
        Вход через Supabase. Только пользователи с ролью <b>admin</b> смогут делать create/update/delete (через Worker + RLS).
      </p>

      {err ? (
        <div style={{ padding: 12, border: "1px solid #ffb4b4", marginBottom: 12 }}>
          <b>Ошибка:</b> {err}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ padding: 10 }} />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={{ padding: 10 }}
        />
        <button onClick={login} disabled={loading} style={{ padding: 10 }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>

      <p style={{ marginTop: 12, opacity: 0.75 }}>
        Если пароля нет — в Supabase Users выбери пользователя → “Reset password” → установи пароль.
      </p>
    </div>
  );
}
