import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

import "../styles/home.css";
import logo from "../assets/logo.png";
import { supabase } from "../lib/supabaseClient";

const VIDEO_BASE_URL = "https://pub-d90782a2cc9c4ef6903dbc26fa37ea43.r2.dev/";

type MonthPost = {
  id: number;
  title: string;
  content: string;
  video_file: string;
  created_at: string;
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

function clampText(s: string, max = 120) {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

export default function Home() {
  useViewportCSSVar();

  const [months, setMonths] = useState<MonthPost[]>([]);
  const [current, setCurrent] = useState<MonthPost | null>(null);

  const [isFading, setIsFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // ✅ UI overlay visibility (авто-прячется)
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  // ✅ Full info panel
  const [infoOpen, setInfoOpen] = useState(false);

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

  const videoSrc = useMemo(() => (current ? `${VIDEO_BASE_URL}${current.video_file}` : ""), [current]);
  const videoType = useMemo(() => {
    const f = current?.video_file?.toLowerCase() || "";
    return f.endsWith(".webm") ? "video/webm" : "video/mp4";
  }, [current]);

  const showUI = (autoHide = true) => {
    setUiVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (autoHide) {
      hideTimer.current = window.setTimeout(() => setUiVisible(false), 2500);
    }
  };

  // Show UI initially then auto-hide
  useEffect(() => {
    showUI(true);
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const changeMonth = (m: MonthPost) => {
    if (!current || m.id === current.id) return;

    setIsFading(true);
    setInfoOpen(false);
    showUI(true);

    window.setTimeout(() => {
      setCurrent(m);
      setIsFading(false);

      const v = videoRef.current;
      if (v) {
        v.load();
        if (!isPaused) v.play().catch(() => {});
      }
    }, 420);
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
    if (isPaused) v.play().catch(() => {});
    else v.pause();
    setIsPaused((p) => !p);
    showUI(true);
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

  // center active month
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !current) return;
    const btn = el.querySelector<HTMLButtonElement>(`button[data-id="${current.id}"]`);
    if (!btn) return;
    const left = btn.offsetLeft - (el.clientWidth - btn.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [current?.id]);

  // ESC closes info
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInfoOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!current) return null;

  const preview = clampText(current.content, 120);

  return (
    <div className="app-shell">
      <header className={`header ${uiVisible ? "" : "hidden-ui"}`}>
        <img src={logo} alt="Кыргызстан" className="logo" />
      </header>

      <main className="stage">
        <div className="video-layer" onClick={() => showUI(true)} onPointerDown={() => showUI(true)}>
          <motion.video
            ref={videoRef}
            className={`hero-video ${isFading ? "fade-out" : "fade-in"}`}
            autoPlay={!isPaused}
            muted
            playsInline
            preload="auto"
            onEnded={onEnded}
            key={`video-${current.id}`}
          >
            <source src={videoSrc} type={videoType} />
          </motion.video>

          {/* Минимальный градиент только для читабельности текста */}
          <div className={`overlay ${uiVisible ? "overlay-strong" : "overlay-weak"}`} />
          <div className="vignette" />
        </div>

        {/* ✅ Мини-лейбл (почти не мешает) */}
        <AnimatePresence>
          {uiVisible ? (
            <motion.section
              className="mini-info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onPointerMove={() => showUI(true)}
            >
              <div className="mini-top">
                <h1 className="mini-title">{current.title}</h1>
                <button className="mini-btn" type="button" onClick={() => setInfoOpen(true)}>
                  Подробнее
                </button>
              </div>
              <p className="mini-sub">Горы • Озёра • Традиции</p>
              <p className="mini-desc">{preview}</p>
            </motion.section>
          ) : null}
        </AnimatePresence>

        {/* ✅ Controls появляются/исчезают вместе с UI */}
        <AnimatePresence>
          {uiVisible ? (
            <motion.div
              className="controls"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <button className="ctrl-btn" onClick={togglePause} aria-label={isPaused ? "Play" : "Pause"}>
                {isPaused ? "▶" : "❚❚"}
              </button>
              <button className="ctrl-btn secondary" onClick={() => setInfoOpen(true)} aria-label="Info">
                i
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ✅ Full info panel (не мешает просмотру: только по кнопке) */}
        <AnimatePresence>
          {infoOpen ? (
            <>
              <motion.div
                className="sheet-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setInfoOpen(false)}
              />
              <motion.aside
                className="sheet"
                role="dialog"
                aria-modal="true"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="sheet-handle" />
                <div className="sheet-head">
                  <div>
                    <div className="sheet-kicker">Описание</div>
                    <div className="sheet-title">{current.title}</div>
                  </div>
                  <button className="sheet-close" onClick={() => setInfoOpen(false)} aria-label="Close">
                    ✕
                  </button>
                </div>
                <div className="sheet-body">
                  <p>{current.content}</p>
                </div>
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>
      </main>

      {/* ✅ Months bar всегда короткие названия */}
      <footer className="months-bar">
        <div className="months-scroll" ref={scrollRef} onPointerMove={() => showUI(true)}>
          {months.map((m, i) => {
            const short = MONTHS_SHORT_RU[i % 12] ?? `${i + 1}`;
            const active = current.id === m.id;
            return (
              <Tippy key={m.id} content={m.title} placement="top" delay={[250, 0]}>
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
    </div>
  );
}
