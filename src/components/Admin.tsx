import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type PostRow = {
  id: number;
  created_at: string;
  title: string | null;
  content: string | null;
  video_file: string | null;

  region: string | null;
  season: string | null;
  fact: string | null;
  map_region: string | null;
  map_url: string | null;
};

const WORKER_BASE_URL = (import.meta.env.VITE_WORKER_BASE_URL as string) || "";

function humanFileSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
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

const REGIONS = [
  { v: "chui", label: "Чуй" },
  { v: "issyk_kul", label: "Иссык-Куль" },
  { v: "naryn", label: "Нарын" },
  { v: "osh", label: "Ош" },
  { v: "jalal_abad", label: "Жалал-Абад" },
  { v: "talas", label: "Талас" },
  { v: "batken", label: "Баткен" },
];

const SEASONS = [
  { v: "winter", label: "Зима" },
  { v: "spring", label: "Весна" },
  { v: "summer", label: "Лето" },
  { v: "autumn", label: "Осень" },
];

export default function Admin() {
  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ разделили статусы
  const [savingText, setSavingText] = useState(false); // update-post / delete-post
  const [uploadingCreate, setUploadingCreate] = useState(false); // create-post
  const [uploadingVideo, setUploadingVideo] = useState(false); // replace-video

  const isBusy = savingText || uploadingCreate || uploadingVideo;

  const [error, setError] = useState("");

  // create form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [region, setRegion] = useState("naryn");
  const [season, setSeason] = useState("winter");
  const [fact, setFact] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // upload progress (create)
  const [uploadPct, setUploadPct] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // edit modal
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editVideoFile, setEditVideoFile] = useState(""); // ✅ только отображение
  const [editRegion, setEditRegion] = useState("naryn");
  const [editSeason, setEditSeason] = useState("winter");
  const [editFact, setEditFact] = useState("");
  const [editMapUrl, setEditMapUrl] = useState("");

  // replace video in edit
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editUploadPct, setEditUploadPct] = useState(0);
  const editXhrRef = useRef<XMLHttpRequest | null>(null);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const load = async () => {
    setError("");
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id, created_at, title, content, video_file, region, season, fact, map_region, map_url")
      .order("id", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setRows((data || []) as PostRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    return () => {
      if (xhrRef.current && xhrRef.current.readyState !== 4) xhrRef.current.abort();
      if (editXhrRef.current && editXhrRef.current.readyState !== 4) editXhrRef.current.abort();
    };
  }, []);

  const validateVideoFile = (f: File | null) => {
    if (!f) return "";
    const allowed = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowed.includes(f.type)) {
      return `Неподдерживаемый формат: ${f.type || "unknown"}. Разрешено: mp4, webm, mov`;
    }
    const MAX = 200 * 1024 * 1024;
    if (f.size > MAX) {
      return `Файл слишком большой: ${humanFileSize(f.size)}. Максимум: ${humanFileSize(MAX)}`;
    }
    return "";
  };

  const validateBeforeUpload = () => {
    if (!WORKER_BASE_URL) return "Не задан VITE_WORKER_BASE_URL";
    if (!title.trim()) return "Заполни Title";
    if (!content.trim()) return "Заполни Content";
    if (!region.trim()) return "Выбери region";
    if (!season.trim()) return "Выбери season";
    if (!fact.trim()) return "Заполни fact (1 строка)";
    if (!file) return "Выбери видеофайл";

    const v = validateVideoFile(file);
    if (v) return v;

    return "";
  };

  // ✅ Create + upload via Worker (JWT) - отдельный статус uploadingCreate
  const createViaWorker = async () => {
    setError("");

    const v = validateBeforeUpload();
    if (v) {
      setError(v);
      return;
    }

    setUploadingCreate(true);
    setUploadPct(0);

    try {
      const jwt = await getJwtOrThrow();

      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", content.trim());
      fd.append("region", region);
      fd.append("season", season);
      fd.append("fact", fact.trim());
      fd.append("map_url", mapUrl.trim());
      fd.append("map_region", region);
      fd.append("file", file!);

      const url = `${stripTrailingSlash(WORKER_BASE_URL)}/api/admin/create-post`;

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      const result = await new Promise<{ ok: boolean; status: number; body: any }>((resolve) => {
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Authorization", `Bearer ${jwt}`);

        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return;
          setUploadPct(Math.round((evt.loaded / evt.total) * 100));
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

      if (!result.ok) throw new Error(result.body?.error || `Upload failed (status ${result.status})`);

      // reset form
      setTitle("");
      setContent("");
      setFact("");
      setMapUrl("");
      setFile(null);
      setUploadPct(0);

      await load();
    } catch (e: any) {
      setError(e?.message || "Create failed");
    } finally {
      setUploadingCreate(false);
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current && xhrRef.current.readyState !== 4) xhrRef.current.abort();
  };

  const startEdit = (row: PostRow) => {
    setEditingId(row.id);
    setEditTitle(row.title || "");
    setEditContent(row.content || "");
    setEditVideoFile(row.video_file || "");
    setEditRegion(row.region || "naryn");
    setEditSeason(row.season || "winter");
    setEditFact(row.fact || "");
    setEditMapUrl(row.map_url || "");

    setEditFile(null);
    setEditUploadPct(0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditVideoFile("");
    setEditRegion("naryn");
    setEditSeason("winter");
    setEditFact("");
    setEditMapUrl("");

    setEditFile(null);
    setEditUploadPct(0);
  };

  // ✅ Update text fields ONLY (НЕ отправляем video_file вообще)
  const saveEditViaWorker = async () => {
    if (editingId === null) return;

    setError("");
    if (!editTitle.trim() || !editContent.trim() || !editRegion.trim() || !editSeason.trim() || !editFact.trim()) {
      setError("В редактировании title/content/region/season/fact не должны быть пустыми");
      return;
    }

    setSavingText(true);
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
          region: editRegion,
          season: editSeason,
          fact: editFact.trim(),
          map_url: editMapUrl.trim() || null,
          map_region: editRegion,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Update failed (status ${res.status})`);

      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.message || "Update failed");
    } finally {
      setSavingText(false);
    }
  };

  // ✅ Replace video ONLY (endpoint /replace-video), update editVideoFile from {file: "..."}
  const replaceVideoViaWorker = async () => {
    if (editingId === null) return;

    setError("");
    if (!WORKER_BASE_URL) {
      setError("Не задан VITE_WORKER_BASE_URL");
      return;
    }
    if (!editFile) {
      setError("Выбери новый видеофайл для замены");
      return;
    }

    const v = validateVideoFile(editFile);
    if (v) {
      setError(v);
      return;
    }

    setUploadingVideo(true);
    setEditUploadPct(0);

    try {
      const jwt = await getJwtOrThrow();

      const fd = new FormData();
      fd.append("id", String(editingId));
      fd.append("file", editFile);

      const url = `${stripTrailingSlash(WORKER_BASE_URL)}/api/admin/replace-video`;

      const xhr = new XMLHttpRequest();
      editXhrRef.current = xhr;

      const result = await new Promise<{ ok: boolean; status: number; body: any }>((resolve) => {
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Authorization", `Bearer ${jwt}`);

        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return;
          setEditUploadPct(Math.round((evt.loaded / evt.total) * 100));
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

      if (!result.ok) throw new Error(result.body?.error || `Replace failed (status ${result.status})`);

      // ✅ твой воркер возвращает { success: true, file: "..." }
      const newFile = result.body?.file;
      if (typeof newFile === "string") {
        setEditVideoFile(newFile);
      }

      setEditFile(null);
      setEditUploadPct(0);

      await load();
    } catch (e: any) {
      setError(e?.message || "Replace video failed");
    } finally {
      setUploadingVideo(false);
    }
  };

  const cancelEditUpload = () => {
    if (editXhrRef.current && editXhrRef.current.readyState !== 4) editXhrRef.current.abort();
  };

  // ✅ Delete via Worker (JWT)
  const removeViaWorker = async (id: number) => {
    const ok = confirm(`Удалить пост #${id}?`);
    if (!ok) return;

    setSavingText(true);
    setError("");

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
      setSavingText(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/KG/login";
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Admin</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} disabled={isBusy}>Reload</button>
          <button onClick={logout} disabled={isBusy}>Logout</button>
        </div>
      </div>

      <p style={{ marginTop: 10, opacity: 0.8 }}>
        Create/Update/Delete/Replace идут через Worker. Authorization = Supabase JWT (роль admin).
      </p>

      {error ? (
        <div style={{ padding: 12, border: "1px solid #ffb4b4", marginBottom: 12 }}>
          <b>Ошибка:</b> {error}
        </div>
      ) : null}

      <div style={{ border: "1px solid #eee", padding: 14, borderRadius: 10, marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Создать пост + загрузить видео</h3>

        <div style={{ display: "grid", gap: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ padding: 10 }} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Content" style={{ padding: 10, minHeight: 90 }} />

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <select value={region} onChange={(e) => setRegion(e.target.value)} style={{ padding: 10 }}>
              {REGIONS.map((r) => (
                <option key={r.v} value={r.v}>{r.label}</option>
              ))}
            </select>
            <select value={season} onChange={(e) => setSeason(e.target.value)} style={{ padding: 10 }}>
              {SEASONS.map((s) => (
                <option key={s.v} value={s.v}>{s.label}</option>
              ))}
            </select>
          </div>

          <input value={fact} onChange={(e) => setFact(e.target.value)} placeholder="Fact (1 строка)" style={{ padding: 10 }} />
          <input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="Map URL (Google Maps link, optional)" style={{ padding: 10 }} />

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={isBusy}
            />
            {file ? (
              <span style={{ opacity: 0.8 }}>
                {file.name} · {humanFileSize(file.size)}
              </span>
            ) : (
              <span style={{ opacity: 0.6 }}>Выбери mp4/webm/mov</span>
            )}
          </div>

          {uploadingCreate ? (
            <div style={{ border: "1px solid #ddd", padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>Загрузка: {uploadPct}%</div>
                <button onClick={cancelUpload} disabled={!uploadingCreate}>Cancel</button>
              </div>
              <div style={{ height: 10 }} />
              <div style={{ height: 10, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${uploadPct}%`, height: "100%", background: "#222" }} />
              </div>
            </div>
          ) : null}

          <button onClick={createViaWorker} disabled={isBusy} style={{ padding: 10 }}>
            {uploadingCreate ? "Uploading..." : "Создать пост + загрузить видео"}
          </button>
        </div>
      </div>

      <h3 style={{ marginTop: 0 }}>Посты</h3>
      {loading ? <p>Загрузка...</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <b>#{row.id}</b>{" "}
                <span style={{ opacity: 0.7 }}>{new Date(row.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => startEdit(row)} disabled={isBusy || isEditing}>Edit</button>
                <button onClick={() => removeViaWorker(row.id)} disabled={isBusy || isEditing}>Delete</button>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              <div><b>Title:</b> {row.title}</div>
              <div><b>Region:</b> <code>{row.region}</code> · <b>Season:</b> <code>{row.season}</code></div>
              <div><b>Fact:</b> {row.fact}</div>
              <div>
                <b>Map:</b>{" "}
                {row.map_url ? (
                  <a href={row.map_url} target="_blank" rel="noopener noreferrer">{row.map_url}</a>
                ) : (
                  <span style={{ opacity: 0.6 }}>—</span>
                )}
              </div>
              <div><b>Video file:</b> <code>{row.video_file}</code></div>
            </div>
          </div>
        ))}
      </div>

      {isEditing ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)" }}>
          <div style={{ background: "#fff", maxWidth: 760, margin: "6vh auto", padding: 16, borderRadius: 12 }}>
            <h3 style={{ marginTop: 0 }}>Edit post #{editingId}</h3>

            <div style={{ display: "grid", gap: 10 }}>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ padding: 10 }} disabled={isBusy} />
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} style={{ padding: 10, minHeight: 120 }} disabled={isBusy} />

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <select value={editRegion} onChange={(e) => setEditRegion(e.target.value)} style={{ padding: 10 }} disabled={isBusy}>
                  {REGIONS.map((r) => (
                    <option key={r.v} value={r.v}>{r.label}</option>
                  ))}
                </select>
                <select value={editSeason} onChange={(e) => setEditSeason(e.target.value)} style={{ padding: 10 }} disabled={isBusy}>
                  {SEASONS.map((s) => (
                    <option key={s.v} value={s.v}>{s.label}</option>
                  ))}
                </select>
              </div>

              <input value={editFact} onChange={(e) => setEditFact(e.target.value)} style={{ padding: 10 }} placeholder="Fact" disabled={isBusy} />
              <input value={editMapUrl} onChange={(e) => setEditMapUrl(e.target.value)} style={{ padding: 10 }} placeholder="Map URL" disabled={isBusy} />

              {/* ✅ video_file только отображаем, НЕ редактируем вручную */}
              <div style={{ padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
                <b>Video file:</b> <code>{editVideoFile || "—"}</code>
              </div>

              {/* ✅ Replace video block */}
              <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 10 }}>
                <b>Заменить видео</b>

                <div style={{ height: 8 }} />

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                    disabled={isBusy}
                  />
                  {editFile ? (
                    <span style={{ opacity: 0.8 }}>
                      {editFile.name} · {humanFileSize(editFile.size)}
                    </span>
                  ) : (
                    <span style={{ opacity: 0.6 }}>Выбери mp4/webm/mov</span>
                  )}
                </div>

                {uploadingVideo && editUploadPct > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>Загрузка: {editUploadPct}%</div>
                      <button onClick={cancelEditUpload} disabled={!uploadingVideo}>Cancel</button>
                    </div>
                    <div style={{ height: 10 }} />
                    <div style={{ height: 10, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ width: `${editUploadPct}%`, height: "100%", background: "#222" }} />
                    </div>
                  </div>
                ) : null}

                <div style={{ marginTop: 10 }}>
                  <button onClick={replaceVideoViaWorker} disabled={isBusy || !editFile} style={{ padding: 10 }}>
                    {uploadingVideo ? "Uploading..." : "Сохранить видео"}
                  </button>
                </div>

                <p style={{ marginTop: 8, opacity: 0.7 }}>
                  Видео сохраняется сразу при нажатии “Сохранить видео”. Основной “Save” нужен только для текста.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <button onClick={cancelEdit} disabled={isBusy}>Close</button>
                <button onClick={saveEditViaWorker} disabled={isBusy}>{savingText ? "Saving..." : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
