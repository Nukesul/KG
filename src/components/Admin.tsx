import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

// =====================
// Types
// =====================
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

type SortKey =
  | "id"
  | "created_at"
  | "title"
  | "region"
  | "season"
  | "fact";

type SortConfig = { key: SortKey; direction: "asc" | "desc" };

const WORKER_BASE_URL = (import.meta.env.VITE_WORKER_BASE_URL as string) || "";

// =====================
// Helpers
// =====================
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
] as const;

const SEASONS = [
  { v: "winter", label: "Зима" },
  { v: "spring", label: "Весна" },
  { v: "summer", label: "Лето" },
  { v: "autumn", label: "Осень" },
] as const;

function regionLabel(v: string | null) {
  return REGIONS.find((x) => x.v === v)?.label || (v || "—");
}
function seasonLabel(v: string | null) {
  return SEASONS.find((x) => x.v === v)?.label || (v || "—");
}

function validateVideoFile(f: File | null) {
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
}

// =====================
// Small UI (GitHub/Amazon-ish, clean)
// =====================
function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function Icon({
  name,
  className,
}: {
  name:
    | "search"
    | "plus"
    | "refresh"
    | "logout"
    | "pencil"
    | "trash"
    | "upload"
    | "x"
    | "check"
    | "alert"
    | "chevDown"
    | "chevUp"
    | "video";
  className?: string;
}) {
  const common = clsx("inline-block", className || "w-4 h-4");
  switch (name) {
    case "search":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M10.5 18.5a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16.5 16.5 21 21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "plus":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "refresh":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12a9 9 0 1 1-2.64-6.36"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M21 3v7h-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "logout":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M15 12H3m0 0 3-3M3 12l3 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "pencil":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 20h9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "trash":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 6h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M10 11v6M14 11v6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "upload":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M7 8l5-5 5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 21h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "x":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M18 6 6 18M6 6l12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "check":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "alert":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9v4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 17h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "chevDown":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "chevUp":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M18 15l-6-6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "video":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M15 10.5V7a2 2 0 0 0-2-2H5A2 2 0 0 0 3 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M15 12l6-4v8l-6-4Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
}) {
  return (
    <span className={clsx("badge", `badge-${tone}`)}>{children}</span>
  );
}

function Toast({
  kind,
  message,
  onClose,
}: {
  kind: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className={clsx("toast", kind === "success" ? "toast-success" : "toast-error")}
      role="status"
      aria-live="polite"
    >
      <div className="toast-icon">
        {kind === "success" ? <Icon name="check" /> : <Icon name="alert" />}
      </div>
      <div className="toast-body">
        <div className="toast-title">{kind === "success" ? "Готово" : "Ошибка"}</div>
        <div className="toast-msg">{message}</div>
      </div>
      <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
        <Icon name="x" />
      </button>
    </motion.div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={clsx("modal", wide && "modal-wide")}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
          >
            <div className="modal-head">
              <div className="modal-title">{title}</div>
              <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
                <Icon name="x" />
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  danger,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => {} : onCancel}
      footer={
        <div className="row row-end gap-8">
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Отмена
          </button>
          <button
            className={clsx("btn", danger ? "btn-danger" : "btn-primary")}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Подождите..." : confirmText}
          </button>
        </div>
      }
    >
      <div className="muted">{description}</div>
    </Modal>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <div className="field-top">
        <div className="field-label">{label}</div>
        {hint ? <div className="field-hint">{hint}</div> : null}
      </div>
      {children}
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  );
}

// =====================
// Main
// =====================
export default function Admin() {
  // data
  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  // list controls
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortConfig>({ key: "id", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // busy flags
  const [savingText, setSavingText] = useState(false);
  const [uploadingCreate, setUploadingCreate] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const isBusy = savingText || uploadingCreate || uploadingVideo;

  // toast
  const [toastSuccess, setToastSuccess] = useState("");
  const [toastError, setToastError] = useState("");

  // create drawer-ish
  const [createOpen, setCreateOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [region, setRegion] = useState("naryn");
  const [season, setSeason] = useState("winter");
  const [fact, setFact] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadPct, setUploadPct] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // edit modal
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editVideoFile, setEditVideoFile] = useState("");
  const [editRegion, setEditRegion] = useState("naryn");
  const [editSeason, setEditSeason] = useState("winter");
  const [editFact, setEditFact] = useState("");
  const [editMapUrl, setEditMapUrl] = useState("");
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editUploadPct, setEditUploadPct] = useState(0);
  const editXhrRef = useRef<XMLHttpRequest | null>(null);

  // confirm delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const isEditing = editingId !== null;

  const load = async () => {
    setToastError("");
    setToastSuccess("");
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id, created_at, title, content, video_file, region, season, fact, map_region, map_url")
      .order("id", { ascending: false });

    if (error) {
      setToastError(error.message);
      setLoading(false);
      return;
    }

    setRows((data || []) as PostRow[]);
    setLoading(false);
    setCurrentPage(1);
  };

  useEffect(() => {
    load();
    return () => {
      if (xhrRef.current && xhrRef.current.readyState !== 4) xhrRef.current.abort();
      if (editXhrRef.current && editXhrRef.current.readyState !== 4) editXhrRef.current.abort();
    };
  }, []);

  // auto clear toasts
  useEffect(() => {
    if (toastSuccess) {
      const t = setTimeout(() => setToastSuccess(""), 2800);
      return () => clearTimeout(t);
    }
  }, [toastSuccess]);

  useEffect(() => {
    if (toastError) {
      const t = setTimeout(() => setToastError(""), 5200);
      return () => clearTimeout(t);
    }
  }, [toastError]);

  // filtering + sorting
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery =
        !q ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.content || "").toLowerCase().includes(q) ||
        (r.fact || "").toLowerCase().includes(q);

      const matchesRegion = regionFilter === "all" ? true : (r.region || "") === regionFilter;
      const matchesSeason = seasonFilter === "all" ? true : (r.season || "") === seasonFilter;

      return matchesQuery && matchesRegion && matchesSeason;
    });
  }, [rows, query, regionFilter, seasonFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;
      const ka = a[sort.key] as any;
      const kb = b[sort.key] as any;

      if (sort.key === "created_at") {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return ta < tb ? -1 * dir : ta > tb ? 1 * dir : 0;
      }

      const va = (ka ?? "") as string | number;
      const vb = (kb ?? "") as string | number;

      if (typeof va === "number" && typeof vb === "number") {
        return va < vb ? -1 * dir : va > vb ? 1 * dir : 0;
      }

      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sa < sb ? -1 * dir : sa > sb ? 1 * dir : 0;
    });
    return arr;
  }, [filtered, sort]);

  // pagination
  const pageCount = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [sorted, currentPage]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [pageCount]);

  // sort helper
  const requestSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      // sensible defaults
      const direction: "asc" | "desc" =
        key === "id" || key === "created_at" ? "desc" : "asc";
      return { key, direction };
    });
  };

  // create validation
  const validateCreateForm = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Заполни Title";
    if (!content.trim()) errors.content = "Заполни Content";
    if (!region.trim()) errors.region = "Выбери region";
    if (!season.trim()) errors.season = "Выбери season";
    if (!fact.trim()) errors.fact = "Заполни fact (1 строка)";
    if (!file) errors.file = "Выбери видеофайл";
    if (file) {
      const v = validateVideoFile(file);
      if (v) errors.file = v;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createViaWorker = async () => {
    if (!validateCreateForm()) return;

    setUploadingCreate(true);
    setUploadPct(0);
    setToastError("");
    setToastSuccess("");

    try {
      if (!WORKER_BASE_URL) throw new Error("Не задан VITE_WORKER_BASE_URL");
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
      setFormErrors({});
      setToastSuccess("Пост создан!");

      await load();
    } catch (e: any) {
      setToastError(e?.message || "Create failed");
    } finally {
      setUploadingCreate(false);
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current && xhrRef.current.readyState !== 4) xhrRef.current.abort();
  };

  // edit
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
    setEditFormErrors({});
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
    setEditFormErrors({});
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};
    if (!editTitle.trim()) errors.editTitle = "Заполни Title";
    if (!editContent.trim()) errors.editContent = "Заполни Content";
    if (!editRegion.trim()) errors.editRegion = "Выбери region";
    if (!editSeason.trim()) errors.editSeason = "Выбери season";
    if (!editFact.trim()) errors.editFact = "Заполни fact (1 строка)";
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveEditViaWorker = async () => {
    if (!validateEditForm()) return;

    setSavingText(true);
    setToastError("");
    setToastSuccess("");

    try {
      if (!WORKER_BASE_URL) throw new Error("Не задан VITE_WORKER_BASE_URL");
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

      setToastSuccess("Пост обновлён!");
      cancelEdit();
      await load();
    } catch (e: any) {
      setToastError(e?.message || "Update failed");
    } finally {
      setSavingText(false);
    }
  };

  const replaceVideoViaWorker = async () => {
    if (editingId === null) return;

    setToastError("");
    setToastSuccess("");

    try {
      if (!WORKER_BASE_URL) throw new Error("Не задан VITE_WORKER_BASE_URL");
      if (!editFile) throw new Error("Выбери новый видеофайл");
      const v = validateVideoFile(editFile);
      if (v) throw new Error(v);

      setUploadingVideo(true);
      setEditUploadPct(0);

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

      const newFile = result.body?.file;
      if (typeof newFile === "string") setEditVideoFile(newFile);

      setEditFile(null);
      setEditUploadPct(0);
      setToastSuccess("Видео заменено!");
      await load();
    } catch (e: any) {
      setToastError(e?.message || "Replace video failed");
    } finally {
      setUploadingVideo(false);
    }
  };

  const cancelEditUpload = () => {
    if (editXhrRef.current && editXhrRef.current.readyState !== 4) editXhrRef.current.abort();
  };

  // delete
  const askDelete = (id: number) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const removeViaWorker = async () => {
    const id = confirmId;
    if (id == null) return;

    setSavingText(true);
    setToastError("");
    setToastSuccess("");

    try {
      if (!WORKER_BASE_URL) throw new Error("Не задан VITE_WORKER_BASE_URL");
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

      setToastSuccess(`Пост #${id} удалён`);
      setConfirmOpen(false);
      setConfirmId(null);
      await load();
    } catch (e: any) {
      setToastError(e?.message || "Delete failed");
    } finally {
      setSavingText(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/KG/login";
  };

  // quick stats
  const stats = useMemo(() => {
    const total = rows.length;
    const withVideo = rows.filter((r) => !!r.video_file).length;
    const byRegion: Record<string, number> = {};
    for (const r of rows) {
      const key = r.region || "unknown";
      byRegion[key] = (byRegion[key] || 0) + 1;
    }
    const topRegion = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    return { total, withVideo, topRegion };
  }, [rows]);

  const SortIndicator = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <span className="sort-ind">·</span>;
    return sort.direction === "asc" ? (
      <span className="sort-ind">
        <Icon name="chevUp" />
      </span>
    ) : (
      <span className="sort-ind">
        <Icon name="chevDown" />
      </span>
    );
  };

  return (
    <div className="page">
      <style></style>

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-badge">KG</div>
            <div>
              <div className="brand-title">Admin</div>
              <div className="brand-sub">Posts • Supabase • Worker</div>
            </div>
          </div>

          <div className="top-actions">
            <button className="btn btn-ghost" onClick={() => setCreateOpen((v) => !v)} disabled={isBusy}>
              <Icon name="plus" />
              Создать
            </button>
            <button className="btn btn-ghost" onClick={load} disabled={isBusy}>
              <Icon name="refresh" />
              Обновить
            </button>
            <button className="btn btn-danger" onClick={logout} disabled={isBusy}>
              <Icon name="logout" />
              Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="layout">
        {/* Left column */}
        <div className="col">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Обзор</div>
                <div className="muted">Быстрые цифры и состояние системы</div>
              </div>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="stat-label">Всего постов</div>
                <div className="stat-value">{stats.total}</div>
              </div>
              <div className="stat">
                <div className="stat-label">С видео</div>
                <div className="stat-value">{stats.withVideo}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Топ регион</div>
                <div className="stat-value">{regionLabel(stats.topRegion)}</div>
              </div>
            </div>

            <div className="divider" />

            <div className="filters">
              <div className="search">
                <Icon name="search" className="w-4 h-4" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск: title / content / fact"
                  className="input input-plain"
                />
              </div>

              <div className="grid2">
                <div>
                  <div className="label">Регион</div>
                  <select className="select" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                    <option value="all">Все</option>
                    {REGIONS.map((r) => (
                      <option key={r.v} value={r.v}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="label">Сезон</div>
                  <select className="select" value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
                    <option value="all">Все</option>
                    {SEASONS.map((s) => (
                      <option key={s.v} value={s.v}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row gap-8 wrap">
                <Badge tone="neutral">Найдено: {sorted.length}</Badge>
                <Badge tone={WORKER_BASE_URL ? "green" : "red"}>
                  Worker: {WORKER_BASE_URL ? "OK" : "нет VITE_WORKER_BASE_URL"}
                </Badge>
                <Badge tone="blue">JWT: через Supabase</Badge>
              </div>
            </div>
          </div>

          {/* Create panel */}
          <AnimatePresence initial={false}>
            {createOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="card"
              >
                <div className="card-head">
                  <div>
                    <div className="card-title">Новый пост</div>
                    <div className="muted">Стиль как у GitHub: чисто, строго, быстро</div>
                  </div>
                  <button className="icon-btn" onClick={() => setCreateOpen(false)} aria-label="Свернуть">
                    <Icon name="x" />
                  </button>
                </div>

                <div className="form">
                  <div className="grid2">
                    <Field label="Заголовок" error={formErrors.title}>
                      <input
                        className="input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Например: Озеро Сон-Куль"
                        disabled={isBusy}
                      />
                    </Field>

                    <Field label="Факт (1 строка)" error={formErrors.fact} hint="Коротко, как тэглайн">
                      <input
                        className="input"
                        value={fact}
                        onChange={(e) => setFact(e.target.value)}
                        placeholder="Например: Самое высокогорное озеро..."
                        disabled={isBusy}
                      />
                    </Field>
                  </div>

                  <Field label="Содержание" error={formErrors.content} hint="Можно длинный текст">
                    <textarea
                      className="textarea"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Текст поста..."
                      disabled={isBusy}
                    />
                  </Field>

                  <div className="grid3">
                    <Field label="Регион" error={formErrors.region}>
                      <select className="select" value={region} onChange={(e) => setRegion(e.target.value)} disabled={isBusy}>
                        {REGIONS.map((r) => (
                          <option key={r.v} value={r.v}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Сезон" error={formErrors.season}>
                      <select className="select" value={season} onChange={(e) => setSeason(e.target.value)} disabled={isBusy}>
                        {SEASONS.map((s) => (
                          <option key={s.v} value={s.v}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Ссылка на карту" hint="Опционально">
                      <input
                        className="input"
                        value={mapUrl}
                        onChange={(e) => setMapUrl(e.target.value)}
                        placeholder="https://..."
                        disabled={isBusy}
                      />
                    </Field>
                  </div>

                  <div className="uploader">
                    <div className="uploader-head">
                      <div className="row gap-8">
                        <Icon name="video" />
                        <div>
                          <div className="uploader-title">Видео</div>
                          <div className="muted">mp4 / webm / mov • до 200MB</div>
                        </div>
                      </div>

                      {file ? (
                        <Badge tone="green">
                          {file.name} • {humanFileSize(file.size)}
                        </Badge>
                      ) : (
                        <Badge tone="amber">Файл не выбран</Badge>
                      )}
                    </div>

                    <div className="row gap-8 wrap">
                      <label className={clsx("btn btn-ghost", isBusy && "btn-disabled")}>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          disabled={isBusy}
                          style={{ display: "none" }}
                        />
                        <Icon name="upload" />
                        Выбрать файл
                      </label>

                      {file && (
                        <button className="btn btn-ghost" onClick={() => setFile(null)} disabled={isBusy}>
                          <Icon name="x" />
                          Очистить
                        </button>
                      )}
                    </div>

                    {formErrors.file && <div className="field-error">{formErrors.file}</div>}

                    {uploadingCreate && (
                      <div className="progress-wrap">
                        <div className="row row-between">
                          <div className="muted">Загрузка… {uploadPct}%</div>
                          <button className="btn btn-danger btn-sm" onClick={cancelUpload}>
                            Отмена
                          </button>
                        </div>
                        <progress className="progress" value={uploadPct} max={100} />
                      </div>
                    )}
                  </div>

                  <div className="row row-between wrap">
                    <div className="muted">
                      <span className="dot" /> Авторизация: JWT • Роль: admin
                    </div>
                    <button className="btn btn-primary" onClick={createViaWorker} disabled={isBusy}>
                      {uploadingCreate ? "Загрузка..." : "Создать пост"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: list */}
        <div className="col col-wide">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Посты</div>
                <div className="muted">
                  Таблица в стиле GitHub: сортировка, компактно, быстро
                </div>
              </div>

              <div className="row gap-8">
                <Badge tone="neutral">
                  Стр. {currentPage} / {pageCount}
                </Badge>
              </div>
            </div>

            {loading ? (
              <div className="skeleton">
                <div className="sk-line" />
                <div className="sk-line" />
                <div className="sk-line" />
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>
                          <button className="th-btn" onClick={() => requestSort("id")}>
                            ID <SortIndicator k="id" />
                          </button>
                        </th>
                        <th>
                          <button className="th-btn" onClick={() => requestSort("created_at")}>
                            Дата <SortIndicator k="created_at" />
                          </button>
                        </th>
                        <th>
                          <button className="th-btn" onClick={() => requestSort("title")}>
                            Заголовок <SortIndicator k="title" />
                          </button>
                        </th>
                        <th className="hide-sm">
                          <button className="th-btn" onClick={() => requestSort("region")}>
                            Регион <SortIndicator k="region" />
                          </button>
                        </th>
                        <th className="hide-sm">
                          <button className="th-btn" onClick={() => requestSort("season")}>
                            Сезон <SortIndicator k="season" />
                          </button>
                        </th>
                        <th className="actions">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty">
                            Ничего не найдено. Попробуй другой запрос/фильтр.
                          </td>
                        </tr>
                      ) : (
                        paginated.map((row) => (
                          <tr key={row.id}>
                            <td className="mono">#{row.id}</td>
                            <td className="mono">
                              {new Date(row.created_at).toLocaleString()}
                            </td>
                            <td>
                              <div className="title-cell">
                                <div className="title-main">{row.title || "—"}</div>
                                <div className="title-sub">
                                  <span className="chip">{seasonLabel(row.season)}</span>
                                  <span className="chip">{regionLabel(row.region)}</span>
                                  {row.video_file ? (
                                    <span className="chip chip-ok">video</span>
                                  ) : (
                                    <span className="chip chip-warn">no video</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="hide-sm">{regionLabel(row.region)}</td>
                            <td className="hide-sm">{seasonLabel(row.season)}</td>
                            <td className="actions">
                              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(row)} disabled={isBusy}>
                                <Icon name="pencil" />
                                Редакт.
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => askDelete(row.id)} disabled={isBusy}>
                                <Icon name="trash" />
                                Удалить
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pager">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Назад
                  </button>

                  <div className="pager-pages">
                    {Array.from({ length: pageCount }, (_, i) => i + 1)
                      .slice(Math.max(0, currentPage - 4), Math.min(pageCount, currentPage + 3))
                      .map((p) => (
                        <button
                          key={p}
                          className={clsx("page-btn", p === currentPage && "page-btn-active")}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      ))}
                  </div>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                    disabled={currentPage === pageCount}
                  >
                    Вперёд
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={isEditing}
        title={editingId ? `Редактирование #${editingId}` : "Редактирование"}
        onClose={() => (isBusy ? null : cancelEdit())}
        wide
        footer={
          <div className="row row-between wrap gap-8">
            <div className="row gap-8 wrap">
              <button className="btn btn-ghost" onClick={cancelEdit} disabled={isBusy}>
                Отмена
              </button>
            </div>
            <div className="row gap-8 wrap">
              <button className="btn btn-primary" onClick={saveEditViaWorker} disabled={isBusy}>
                {savingText ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        }
      >
        <div className="form">
          <div className="grid2">
            <Field label="Заголовок" error={editFormErrors.editTitle}>
              <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={isBusy} />
            </Field>

            <Field label="Факт (1 строка)" error={editFormErrors.editFact}>
              <input className="input" value={editFact} onChange={(e) => setEditFact(e.target.value)} disabled={isBusy} />
            </Field>
          </div>

          <Field label="Содержание" error={editFormErrors.editContent}>
            <textarea className="textarea" value={editContent} onChange={(e) => setEditContent(e.target.value)} disabled={isBusy} />
          </Field>

          <div className="grid3">
            <Field label="Регион" error={editFormErrors.editRegion}>
              <select className="select" value={editRegion} onChange={(e) => setEditRegion(e.target.value)} disabled={isBusy}>
                {REGIONS.map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Сезон" error={editFormErrors.editSeason}>
              <select className="select" value={editSeason} onChange={(e) => setEditSeason(e.target.value)} disabled={isBusy}>
                {SEASONS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ссылка на карту" hint="Опционально">
              <input className="input" value={editMapUrl} onChange={(e) => setEditMapUrl(e.target.value)} disabled={isBusy} />
            </Field>
          </div>

          <div className="divider" />

          <div className="card subcard">
            <div className="row row-between wrap gap-8">
              <div className="row gap-8">
                <Icon name="video" />
                <div>
                  <div className="subcard-title">Видео</div>
                  <div className="muted">Текущее: {editVideoFile || "—"}</div>
                </div>
              </div>

              <div className="row gap-8 wrap">
                <label className={clsx("btn btn-ghost btn-sm", isBusy && "btn-disabled")}>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                    disabled={isBusy}
                    style={{ display: "none" }}
                  />
                  <Icon name="upload" />
                  Выбрать
                </label>

                <button className="btn btn-primary btn-sm" onClick={replaceVideoViaWorker} disabled={isBusy || !editFile}>
                  {uploadingVideo ? "Загрузка..." : "Заменить"}
                </button>

                {editFile && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditFile(null)} disabled={isBusy}>
                    <Icon name="x" />
                    Сброс
                  </button>
                )}
              </div>
            </div>

            {editFile && (
              <div className="row row-between wrap gap-8 mt-10">
                <Badge tone="neutral">
                  {editFile.name} • {humanFileSize(editFile.size)}
                </Badge>
                <Badge tone={validateVideoFile(editFile) ? "red" : "green"}>
                  {validateVideoFile(editFile) ? "Не валидно" : "Ок"}
                </Badge>
              </div>
            )}

            {uploadingVideo && (
              <div className="progress-wrap mt-10">
                <div className="row row-between">
                  <div className="muted">Загрузка… {editUploadPct}%</div>
                  <button className="btn btn-danger btn-sm" onClick={cancelEditUpload}>
                    Отмена
                  </button>
                </div>
                <progress className="progress" value={editUploadPct} max={100} />
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={confirmOpen}
        title="Удалить пост?"
        description={confirmId != null ? `Пост #${confirmId} будет удалён без возможности восстановления.` : "Будет удалено."}
        confirmText={confirmId != null ? `Удалить #${confirmId}` : "Удалить"}
        danger
        busy={savingText}
        onCancel={() => {
          if (savingText) return;
          setConfirmOpen(false);
          setConfirmId(null);
        }}
        onConfirm={removeViaWorker}
      />

      {/* Toasts */}
      <div className="toasts">
        <AnimatePresence>
          {toastSuccess && (
            <Toast kind="success" message={toastSuccess} onClose={() => setToastSuccess("")} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {toastError && <Toast kind="error" message={toastError} onClose={() => setToastError("")} />}
        </AnimatePresence>
      </div>
    </div>
  );
}