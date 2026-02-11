import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/admin", { replace: true }); // basename уже /KG
    });
  }, [nav]);

  const onLogin = async () => {
    setError("");
    setSaving(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSaving(false);

    if (error) return setError(error.message);
    nav("/admin", { replace: true });
  };

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Admin login</h2>

      {error ? (
        <div style={{ padding: 12, border: "1px solid #ffb4b4", marginBottom: 12 }}>
          <b>Ошибка:</b> {error}
        </div>
      ) : null}

      <label style={{ display: "block", marginBottom: 6, opacity: 0.8 }}>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{ width: "100%", padding: 10 }}
        autoComplete="email"
      />

      <div style={{ height: 12 }} />

      <label style={{ display: "block", marginBottom: 6, opacity: 0.8 }}>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        style={{ width: "100%", padding: 10 }}
        autoComplete="current-password"
      />

      <div style={{ height: 12 }} />

      <button onClick={onLogin} disabled={saving} style={{ width: "100%", padding: 10 }}>
        {saving ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
