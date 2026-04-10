import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../styles/Admin.css";

type PostRow = {
  id: number;
  created_at: string;
  title: string | null;
  content: string | null;
  image_file: string | null;
  region: string | null;
  season: string | null;
  fact: string | null;
  map_url: string | null;
};

const REGIONS = ["chui", "issyk_kul", "naryn", "osh", "jalal_abad", "talas", "batken"] as const;
const SEASONS = ["winter", "spring", "summer", "autumn"] as const;

const WORKER_BASE_URL = (import.meta.env.VITE_WORKER_BASE_URL as string) || "";

export default function Admin() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Create
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [region, setRegion] = useState("naryn");
  const [season, setSeason] = useState("winter");
  const [fact, setFact] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editRegion, setEditRegion] = useState("naryn");
  const [editSeason, setEditSeason] = useState("winter");
  const [editFact, setEditFact] = useState("");
  const [editMapUrl, setEditMapUrl] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState("");

  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("posts").select("*").order("id", { ascending: false });
    if (error) showToast("error", error.message);
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { 
    load(); 
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), type === "success" ? 2500 : 4000);
  };

  // ==================== CREATE ====================
  const createViaWorker = async () => {
    if (!title.trim() || !content.trim() || !fact.trim() || !file) {
      showToast("error", "Заполните все обязательные поля и выберите картинку");
      return;
    }

    setIsBusy(true);
    try {
      const jwt = (await supabase.auth.getSession()).data.session?.access_token;
      if (!jwt) throw new Error("Не авторизован");

      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", content.trim());
      fd.append("region", region);
      fd.append("season", season);
      fd.append("fact", fact.trim());
      fd.append("map_url", mapUrl.trim());
      fd.append("file", file);

      const res = await fetch(`${WORKER_BASE_URL}/api/admin/create-post`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
        body: fd,
      });

      if (!res.ok) throw new Error("Ошибка создания поста");
      
      showToast("success", "Пост успешно создан!");
      setDrawerOpen(false);
      setTitle(""); 
      setContent(""); 
      setFact(""); 
      setMapUrl(""); 
      setFile(null);
      await load();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setIsBusy(false);
    }
  };

  // ==================== EDIT ====================
  const startEdit = (row: PostRow) => {
    setEditingId(row.id);
    setEditTitle(row.title || "");
    setEditContent(row.content || "");
    setEditRegion(row.region || "naryn");
    setEditSeason(row.season || "winter");
    setEditFact(row.fact || "");
    setEditMapUrl(row.map_url || "");
    setEditImageFile(row.image_file || "");
    setEditFile(null);
  };

  const saveEditViaWorker = async () => {
    if (!editTitle.trim() || !editContent.trim() || !editFact.trim()) {
      showToast("error", "Заполните обязательные поля");
      return;
    }
    setIsBusy(true);
    try {
      const jwt = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${WORKER_BASE_URL}/api/admin/update-post`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${jwt}` 
        },
        body: JSON.stringify({
          id: editingId,
          title: editTitle.trim(),
          content: editContent.trim(),
          region: editRegion,
          season: editSeason,
          fact: editFact.trim(),
          map_url: editMapUrl.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Не удалось сохранить");
      showToast("success", "Пост обновлён!");
      setEditingId(null);
      await load();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setIsBusy(false);
    }
  };

  const replaceImageViaWorker = async () => {
    if (!editFile || !editingId) return;
    setIsBusy(true);
    try {
      const jwt = (await supabase.auth.getSession()).data.session?.access_token;
      const fd = new FormData();
      fd.append("id", String(editingId));
      fd.append("file", editFile);

      const res = await fetch(`${WORKER_BASE_URL}/api/admin/replace-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка замены");

      setEditImageFile(data.file);
      setEditFile(null);
      showToast("success", "Картинка заменена!");
      await load();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setIsBusy(false);
    }
  };

  const removeViaWorker = async () => {
    if (!confirmId) return;
    setIsBusy(true);
    try {
      const jwt = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${WORKER_BASE_URL}/api/admin/delete-post`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${jwt}` 
        },
        body: JSON.stringify({ id: confirmId }),
      });

      if (!res.ok) throw new Error("Не удалось удалить");
      showToast("success", `Пост #${confirmId} удалён`);
      setConfirmId(null);
      await load();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setIsBusy(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="adm">
      {/* Top Bar */}
      <div className="admTop">
        <div className="admTopIn">
          <div className="admBrand">KG Admin</div>
          <div className="admTopActions">
            <button className="admBtn admBtnPrimary" onClick={() => setDrawerOpen(true)} disabled={isBusy}>
              Новый пост
            </button>
            <button className="admBtn admBtnGhost" onClick={load} disabled={isBusy}>Обновить</button>
            <button className="admBtn admBtnDanger" onClick={logout}>Выйти</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="admBody">
        <div className="admCard">
          <div className="admCardHead">
            <h2>Посты ({rows.length})</h2>
          </div>

          {loading ? (
            <p>Загрузка...</p>
          ) : (
            <div className="admTableWrap">
              <table className="admTable">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Заголовок</th>
                    <th>Регион</th>
                    <th>Сезон</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>#{row.id}</td>
                      <td>{row.title}</td>
                      <td>{row.region}</td>
                      <td>{row.season}</td>
                      <td>
                        <button className="admBtn admBtnGhost" onClick={() => startEdit(row)}>Редактировать</button>
                        <button className="admBtn admBtnDanger" onClick={() => setConfirmId(row.id)}>Удалить</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Новый пост Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div className="admDrawerOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)}>
            <motion.div className="admDrawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} onClick={e => e.stopPropagation()}>
              <h2>Новый пост</h2>
              <input placeholder="Заголовок" value={title} onChange={e => setTitle(e.target.value)} className="admInput" />
              <textarea placeholder="Содержание" value={content} onChange={e => setContent(e.target.value)} className="admTextarea" />
              <input placeholder="Факт" value={fact} onChange={e => setFact(e.target.value)} className="admInput" />
              
              <select value={region} onChange={e => setRegion(e.target.value)} className="admSelect">
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={season} onChange={e => setSeason(e.target.value)} className="admSelect">
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />

              <div className="admDrawerFoot">
                <button onClick={() => setDrawerOpen(false)} className="admBtn admBtnGhost">Отмена</button>
                <button onClick={createViaWorker} disabled={isBusy} className="admBtn admBtnPrimary">
                  Создать
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Редактирование Modal */}
      <AnimatePresence>
        {editingId !== null && (
          <motion.div className="admModalOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="admModal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h2>Редактировать пост #{editingId}</h2>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="admInput" placeholder="Заголовок" />
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="admTextarea" placeholder="Содержание" />
              <input value={editFact} onChange={e => setEditFact(e.target.value)} className="admInput" placeholder="Факт" />

              <select value={editRegion} onChange={e => setEditRegion(e.target.value)} className="admSelect">
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={editSeason} onChange={e => setEditSeason(e.target.value)} className="admSelect">
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <div>Текущая картинка: {editImageFile ? "Есть" : "Нет"}</div>
              <input type="file" accept="image/*" onChange={e => setEditFile(e.target.files?.[0] || null)} />

              <div className="admModalFoot">
                <button onClick={() => setEditingId(null)} className="admBtn admBtnGhost">Отмена</button>
                <button onClick={saveEditViaWorker} disabled={isBusy} className="admBtn admBtnPrimary">Сохранить</button>
                {editFile && <button onClick={replaceImageViaWorker} disabled={isBusy} className="admBtn admBtnPrimary">Заменить картинку</button>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete */}
      <AnimatePresence>
        {confirmId && (
          <motion.div className="admModalOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="admModal">
              <h2>Удалить пост?</h2>
              <p>Пост #{confirmId} будет удалён навсегда.</p>
              <div className="admModalFoot">
                <button onClick={() => setConfirmId(null)} className="admBtn admBtnGhost">Отмена</button>
                <button onClick={removeViaWorker} disabled={isBusy} className="admBtn admBtnDanger">Удалить</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div className={`admToast ${toast.type === "success" ? "admToastSuccess" : "admToastError"}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}