import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

import "../styles/home.css";
import logo from "../assets/logo.png";
import { supabase } from "../lib/supabaseClient";
import KyrgyzstanMap from "./KyrgyzstanMap";

const VIDEO_BASE_URL = "https://pub-d90782a2cc9c4ef6903dbc26fa37ea43.r2.dev/";

type MonthPost = {
  id: number;
  title: string | null;
  content: string | null;
  video_file: string | null;
  created_at: string;

  region: string | null;   // chui / naryn / issyk_kul ...
  season: string | null;   // winter/spring/summer/autumn
  fact: string | null;     // 1 строка
  map_url: string | null;  // ссылка
};

const MONTHS_SHORT_RU = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];

function useViewportCSSVar() {
  useEffect(() => {
    const setVars = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${h}px`);
    };
    setVars();
    window.addEventListener("resize", setVars);
    window.visualViewport?.addEventListener("resize", setVars);
    window.visualViewport?.addEventListener("scroll", setVars);
    return () => {
      window.removeEventListener("resize", setVars);
      window.visualViewport?.removeEventListener("resize", setVars);
      window.visualViewport?.removeEventListener("scroll", setVars);
    };
  }, []);
}

function clampText(s: string, max = 110) {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

function seasonLabel(s?: string | null) {
  const v = (s || "").toLowerCase();
  if (v === "winter") return "Зима";
  if (v === "spring") return "Весна";
  if (v === "summer") return "Лето";
  if (v === "autumn") return "Осень";
  return "Сезон";
}

function regionLabel(r?: string | null) {
  const v = (r || "").toLowerCase();
  const map: Record<string, string> = {
    chui: "Чуй",
    issyk_kul: "Иссык-Куль",
    naryn: "Нарын",
    osh: "Ош",
    jalal_abad: "Жалал-Абад",
    talas: "Талас",
    batken: "Баткен",
  };
  return map[v] || "Область";
}

export default function Home() {
  useViewportCSSVar();

  const [months, setMonths] = useState<MonthPost[]>([]);
  const [current, setCurrent] = useState<MonthPost | null>(null);

  const [isFading, setIsFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // ✅ звук: по умолчанию muted
  const [muted, setMuted] = useState(true);

  // ✅ cinema mode
  const [cinema, setCinema] = useState(false);

  // ✅ автоскрытие UI
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  // ✅ если автоплей заблокирован
  const [needsTapToStart, setNeedsTapToStart] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Load posts
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("posts").select("*").order("id", { ascending: true });
      if (error) {
        console.error("Supabase load error:", error);
        return;
      }
      const rows = (data || []) as MonthPost[];
      setMonths(rows);
      setCurrent(rows[0] ?? null);
    };
    load();
  }, []);

  const videoSrc = useMemo(() => {
    if (!current?.video_file) return "";
    return `${VIDEO_BASE_URL}${current.video_file}`;
  }, [current?.video_file]);

  const videoType = useMemo(() => {
    const f = current?.video_file?.toLowerCase() || "";
    return f.endsWith(".webm") ? "video/webm" : "video/mp4";
  }, [current?.video_file]);

  const theme = useMemo(() => {
    if (!current) return "t1";
    const idx = (current.id ?? 1) % 4;
    return ["t1", "t2", "t3", "t4"][idx];
  }, [current?.id]);

  const showUI = (autoHide = true) => {
    if (cinema) return;
    setUiVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (autoHide) hideTimer.current = window.setTimeout(() => setUiVisible(false), 2200);
  };

  const tryPlay = async () => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = muted;
    v.playsInline = true;

    if (isPaused) return;

    try {
      await v.play();
      setNeedsTapToStart(false);
    } catch {
      setNeedsTapToStart(true);
    }
  };

  useEffect(() => {
    if (!current) return;

    if (cinema) setUiVisible(false);
    else showUI(true);

    const t = window.setTimeout(() => tryPlay(), 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, isPaused]);

  useEffect(() => {
    const onGesture = () => {
      if (needsTapToStart) tryPlay();
    };
    window.addEventListener("touchstart", onGesture, { passive: true });
    window.addEventListener("pointerdown", onGesture, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onGesture);
      window.removeEventListener("pointerdown", onGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsTapToStart, muted, isPaused]);

  const changeMonth = (m: MonthPost) => {
    if (!current || m.id === current.id) return;

    setIsFading(true);
    setNeedsTapToStart(false);
    showUI(true);

    window.setTimeout(() => {
      setCurrent(m);
      setIsFading(false);

      const v = videoRef.current;
      if (v) v.load();
      window.setTimeout(() => tryPlay(), 60);
    }, 380);
  };

  const onEnded = () => {
    if (!months.length || !current || isPaused) return;
    const idx = months.findIndex((x) => x.id === current.id);
    const next = months[(idx + 1) % months.length];
    if (next) changeMonth(next);
  };

  const togglePause = () => {
    const v = videoRef.current;
    if (!v) return;

    if (isPaused) {
      setIsPaused(false);
      window.setTimeout(() => tryPlay(), 0);
    } else {
      v.pause();
      setIsPaused(true);
    }
    showUI(true);
  };

  const toggleMuted = () => {
    const v = videoRef.current;
    const next = !muted;
    setMuted(next);
    if (v) {
      v.muted = next;
      window.setTimeout(() => tryPlay(), 0);
    }
    showUI(true);
  };

  const toggleCinema = () => {
    setCinema((prev) => {
      const next = !prev;
      if (next) {
        setUiVisible(false);
      } else {
        setUiVisible(true);
        showUI(true);
      }
      return next;
    });
  };

  // Scroll indicator
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setScrollProgress(max > 0 ? el.scrollLeft / max : 0);
      el.classList.toggle("scrolled-to-end", el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    };

    el.addEventListener("scroll", update, { passive: true });
    update();
    return () => el.removeEventListener("scroll", update);
  }, [months.length]);

  // Center active button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !current) return;
    const btn = el.querySelector<HTMLButtonElement>(`button[data-id="${current.id}"]`);
    if (!btn) return;
    const left = btn.offsetLeft - (el.clientWidth - btn.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [current?.id]);

  if (!current) return null;

  const preview = clampText(current.content || "", 110);
  const fact = clampText(current.fact || "", 90);

  const activeRegion = (current.region || "").toLowerCase();

  return (
    <div
      className={`fs-shell ${theme} ${cinema ? "cinema" : ""}`}
      onPointerMove={() => showUI(true)}
      onClick={() => showUI(true)}
    >
      <div className="video-layer">
        <motion.video
          ref={videoRef}
          className={`hero-video ${isFading ? "fade-out" : "fade-in"}`}
          autoPlay
          muted={muted}
          playsInline
          preload="metadata"
          onEnded={onEnded}
          onCanPlay={() => tryPlay()}
          key={`video-${current.id}`}
        >
          <source src={videoSrc} type={videoType} />
        </motion.video>

        <div className={`overlay ${uiVisible && !cinema ? "overlay-strong" : "overlay-weak"} ${cinema ? "overlay-cinema" : ""}`} />
        <div className={`vignette ${cinema ? "vignette-cinema" : ""}`} />
        <div className="grain" aria-hidden="true" />
      </div>

      <header className={`header ${uiVisible && !cinema ? "" : "hidden-ui"}`}>
        <img src={logo} alt="Кыргызстан" className="logo" />
      </header>

      {/* мини-карта (не мешает) */}
      <KyrgyzstanMap activeRegion={activeRegion} mapUrl={current.map_url} />

      {/* если автоплей заблокирован */}
      <AnimatePresence>
        {needsTapToStart && !cinema ? (
          <motion.div
            className="tap-to-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.95, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation();
              tryPlay();
            }}
          >
            Нажми, чтобы запустить видео
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {uiVisible && !cinema ? (
          <motion.section
            className="mini-info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="mini-top">
              <h1 className="mini-title">{current.title || "Кыргызстан"}</h1>

              <div className="mini-badges">
                <span className="badge">{regionLabel(current.region)}</span>
                <span className="badge season">{seasonLabel(current.season)}</span>
              </div>
            </div>

            {/* 1 строка факта (главное!) */}
            {fact ? <p className="mini-fact">💡 {fact}</p> : null}

            {/* короткое описание (1 строка) */}
            {preview ? <p className="mini-desc">{preview}</p> : null}
          </motion.section>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {uiVisible && !cinema ? (
          <motion.div
            className="controls"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <button className="ctrl-btn" onClick={(e) => { e.stopPropagation(); togglePause(); }}>
              {isPaused ? "▶" : "❚❚"}
            </button>

            <button className="ctrl-btn secondary" onClick={(e) => { e.stopPropagation(); toggleMuted(); }}>
              {muted ? "🔇" : "🔊"}
            </button>

            <button className="ctrl-btn secondary" onClick={(e) => { e.stopPropagation(); toggleCinema(); }}>
              🎬
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <footer className={`months-bar ${uiVisible && !cinema ? "" : "hidden-ui"}`} onClick={(e) => e.stopPropagation()}>
        <div className="months-scroll" ref={scrollRef}>
          {months.map((m, i) => {
            const short = MONTHS_SHORT_RU[i % 12] ?? `${i + 1}`;
            const active = current.id === m.id;
            return (
              <Tippy key={m.id} content={m.title || ""} placement="top" delay={[250, 0]}>
                <button
                  type="button"
                  data-id={m.id}
                  className={`month-btn ${active ? "active" : ""}`}
                  onClick={() => changeMonth(m)}
                >
                  {short}
                </button>
              </Tippy>
            );
          })}

          <div className="scroll-hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="scroll-arrow">
              <path
                d="M8 5l8 7-8 7"
                stroke="currentColor"
                strokeWidth="2.25"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="scroll-indicator" aria-hidden="true">
          <div className="scroll-progress" style={{ width: `${scrollProgress * 100}%` }} />
        </div>
      </footer>

      <AnimatePresence>
        {cinema ? (
          <motion.div
            className="cinema-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation();
              setCinema(false);
              setUiVisible(true);
              showUI(true);
            }}
          >
            Тапни, чтобы выйти из 🎬 режима
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
