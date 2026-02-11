import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type PostRow = {
  id: number;
  created_at: string;
  title: string | null;
  content: string | null;
  video_file: string | null;
};

const WORKER_BASE_URL = (import.meta.env.VITE_WORKER_BASE_URL as string) || "";

function humanFileSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n = n / 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, "");
}

async function getJwtOrThrow() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error("Not authenticated");
  return jwt;
}

export default function Admin() {
  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [uploadPct, setUploadPct] = useState<number>(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editVideoFile, setEditVideoFile] = useState("");

  const [authed, setAuthed] = useState(false);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const load = async () => {
    setError("");
    setLoading(true);

    // чтение можно делать напрямую из Supabase (у тебя SELECT public разрешён)
    const { data, error } = await supabase
      .from("posts")
      .select("id, created_at, title, content, video_file")
      .order("id", { ascending: true });

    if (error) setError(error.message);
    setRows((data || []) as PostRow[]);
    setLoading(false);
  };

  useEffect(() => {
    // auth state
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    load();

    return () => {
      sub.subscription.unsubscribe();
      if (xhrRef.current && xhrRef.current.readyState !== 4) {
        xhrRef.current.abort();
      }
    };
  }, []);

  const validateBeforeUpload = () => {
    if (!WORKER_BASE_URL) return "Не задан VITE_WORKER_BASE_URL";
    if (!title.trim()) return "Заполни Title";
    if (!content.trim()) return "Заполни Content";
    if (!file) return "Выбери видеофайл";

    const allowed = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowed.includes(file.type)) {
      return `Неподдерживаемый формат: ${file.type || "unknown"}. Разрешено: mp4, webm, mov`;
    }

    const MAX = 200 * 1024 * 1024; // 200MB — должно совпадать с Worker
    if (file.size > MAX) {
      return `Файл слишком большой: ${humanFileSize(file.size)}. Максимум: ${humanFileSize(MAX)}`;
    }

    return "";
  };

  // ✅ Upload/create через Worker, Authorization = Supabase JWT
  const createViaWorker = async () => {
    setError("");

    if (!authed) {
      setError("Сначала нужно войти (login).");
      return;
    }

    const v = validateBeforeUpload();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    setUploadPct(0);

    const jwt = await getJwtOrThrow();

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("content", content.trim());
    fd.append("file", file!);

    const url = `${stripTrailingSlash(WORKER_BASE_URL)}/api/admin/create-post`;

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    const result = await new Promise<{ ok: boolean; status: number; body: any }>((resolve) => {
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${jwt}`);

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setUploadPct(pct);
      };

      xhr.onload = () => {
        let body: any = null;
        try {
          body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          body = { error: "Invalid JSON from server" };
        }
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body });
      };

      xhr.onerror = () => resolve({ ok: false, status: 0, body: { error: "Network error" } });
      xhr.onabort = () => resolve({ ok: false, status: 0, body: { error: "Upload aborted" } });

      xhr.send(fd);
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.body?.error || `Upload failed (status ${result.status})`);
      return;
    }

    setTitle("");
    setContent("");
    setFile(null);
    setUploadPct(0);

    await load();
  };

  const cancelUpload = () => {
    if (xhrRef.current && xhrRef.current.readyState !== 4) {
      xhrRef.current.abort();
    }
  };

  const startEdit = (row: PostRow) => {
    setEditingId(row.id);
    setEditTitle(row.title || "");
    setEditContent(row.content || "");
    setEditVideoFile(row.video_file || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditVideoFile("");
  };

  // ✅ update через Worker
  const saveEditViaWorker = async () => {
    if (editingId === null) return;

    setError("");
    if (!authed) {
      setError("Сначала нужно войти (login).");
      return;
    }

    if (!editTitle.trim() || !editContent.trim() || !editVideoFile.trim()) {
      setError("В редактировании нельзя оставлять пустые поля");
      return;
    }

    setSaving(true);
    try {
      const jwt = await getJwtOrThrow();
      const res = await fetch(`${stripTrailingSlash(WORKER_BASE_URL)}/api/admin/update-post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          id: editingId,
          title: editTitle.trim(),
          content: editContent.trim(),
          video_file: editVideoFile.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Update failed (status ${res.status})`);

      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // ✅ delete через Worker
  const removeViaWorker = async (id: number) => {
    const ok = confirm(`Удалить пост #${id}?`);
    if (!ok) return;

    setError("");
    if (!authed) {
      setError("Сначала нужно войти (login).");
      return;
    }

    setSaving(true);
    try {
      const jwt = await getJwtOrThrow();
      const res = await fetch(`${stripTrailingSlash(WORKER_BASE_URL)}/api/admin/delete-post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Delete failed (status ${res.status})`);

      await load();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h2 style={{ marginBottom: 12 }}>Admin</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ opacity: 0.75 }}>
            Auth: <b>{authed ? "OK" : "NO"}</b>
          </span>
          {authed ? (
            <button onClick={logout} disabled={saving}>
              Logout
            </button>
          ) : (
            <a href="/KG/login">Login</a>
          )}
        </div>
      </div>

      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Create/update/delete идут через Worker. Authorization = Supabase JWT (admin role).
      </p>

      {error ? (
        <div style={{ padding: 12, border: "1px solid #ffb4b4", marginBottom: 12 }}>
          <b>Ошибка:</b> {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr", marginBottom: 18 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ padding: 10 }} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content"
          style={{ padding: 10, minHeight: 90 }}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={!authed || saving}
          />
          {file ? (
            <span style={{ opacity: 0.8 }}>
              {file.name} · {humanFileSize(file.size)}
            </span>
          ) : (
            <span style={{ opacity: 0.6 }}>Выбери mp4/webm/mov</span>
          )}
        </div>

        {saving ? (
          <div style={{ border: "1px solid #ddd", padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>Загрузка: {uploadPct}%</div>
              <button onClick={cancelUpload} disabled={!saving}>
                Cancel upload
              </button>
            </div>
            <div style={{ height: 10 }} />
            <div style={{ height: 10, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${uploadPct}%`, height: "100%", background: "#222" }} />
            </div>
          </div>
        ) : null}

        <button onClick={createViaWorker} disabled={!authed || saving} style={{ padding: 10 }}>
          {saving ? "Uploading..." : "Создать пост + загрузить видео"}
        </button>
      </div>

      <hr />

      <div style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Посты</h3>

        {loading ? <p>Загрузка...</p> : null}

        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row) => (
            <div key={row.id} style={{ border: "1px solid #ddd", padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <b>#{row.id}</b>{" "}
                  <span style={{ opacity: 0.7 }}>{new Date(row.created_at).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => startEdit(row)} disabled={saving || isEditing || !authed}>
                    Edit
                  </button>
                  <button onClick={() => removeViaWorker(row.id)} disabled={saving || isEditing || !authed}>
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div>
                  <b>Title:</b> {row.title}
                </div>
                <div>
                  <b>Content:</b> {row.content}
                </div>
                <div>
                  <b>Video file:</b> <code>{row.video_file}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isEditing ? (
        <div style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }}>
          <div style={{ background: "#fff", maxWidth: 720, margin: "6vh auto", padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Edit post #{editingId}</h3>

            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{ padding: 10, width: "100%" }}
              disabled={saving}
            />
            <div style={{ height: 10 }} />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{ padding: 10, width: "100%", minHeight: 120 }}
              disabled={saving}
            />
            <div style={{ height: 10 }} />
            <input
              value={editVideoFile}
              onChange={(e) => setEditVideoFile(e.target.value)}
              style={{ padding: 10, width: "100%" }}
              disabled={saving}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
              <button onClick={saveEditViaWorker} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

            <p style={{ marginTop: 10, opacity: 0.7 }}>
              (Видео при UPDATE не перезаливаем — меняется только ссылка/имя. Если хочешь “замену видео”, добавим отдельную кнопку.)
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
