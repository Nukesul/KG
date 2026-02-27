import { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  region: string | null;
  season: string | null;
  fact: string | null;
  map_url: string | null;
};

const MONTHS_SHORT_RU = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

function useViewportCSSVar() {
  useLayoutEffect(() => {
    const setVars = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${h}px`);
    };
    setVars();
    window.addEventListener("resize", setVars);
    window.visualViewport?.addEventListener("resize", setVars);
    return () => {
      window.removeEventListener("resize", setVars);
      window.visualViewport?.removeEventListener("resize", setVars);
    };
  }, []);
}

function clampText(s: string, max = 110) {
  const t = (s || "").trim();
  return t.length <= max ? t : t.slice(0, max).trimEnd() + "…";
}

function seasonLabel(s?: string | null) {
  const v = (s || "").toLowerCase();
  const map: Record<string, string> = { winter: "Зима", spring: "Весна", summer: "Лето", autumn: "Осень" };
  return map[v] || "Сезон";
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

  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(true);

  const [cinema, setCinema] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);

  const [needsTapToStart, setNeedsTapToStart] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactingRef = useRef(false);

  // pointer-move throttling
  const rafRef = useRef<number | null>(null);
  const lastShowTsRef = useRef<number>(0);

  // Load posts
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.from("posts").select("*").order("id", { ascending: true });
        if (error) {
          console.error("Supabase load error:", error);
          return;
        }
        const rows = (data || []) as MonthPost[];
        setMonths(rows);
        if (rows.length > 0) setCurrent(rows[0]);
      } catch (err) {
        console.error("Failed to load posts:", err);
      }
    };
    load();
  }, []);

  const activeRegion = useMemo(() => (current?.region || "").toLowerCase() || null, [current?.region]);

  const videoSrc = useMemo(() => {
    return current?.video_file ? `${VIDEO_BASE_URL}${current.video_file}` : null;
  }, [current?.video_file]);

  const videoType = useMemo(() => {
    if (!current?.video_file) return "";
    const f = current.video_file.toLowerCase();
    return f.endsWith(".webm") ? "video/webm" : "video/mp4";
  }, [current?.video_file]);

  const theme = useMemo(() => {
    if (!current) return "t1";
    return ["t1", "t2", "t3", "t4"][current.id % 4];
  }, [current?.id]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    // в cinema UI не нужен
    if (cinema || needsTapToStart) return;

    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (interactingRef.current) return;
      setUiVisible(false);
    }, 3000);
  }, [cinema, needsTapToStart, clearHideTimer]);

  const showUI = useCallback(
    (autoHide = true) => {
      if (cinema) return; // в cinema UI спрятан
      setUiVisible(true);
      clearHideTimer();
      if (autoHide) scheduleAutoHide();
    },
    [cinema, scheduleAutoHide, clearHideTimer]
  );

  const onPointerActivity = useCallback(() => {
    if (cinema) return; // в cinema не показываем UI, а выход делаем кликом (см. onRootClick)
    const now = performance.now();
    if (now - lastShowTsRef.current < 140) return;
    lastShowTsRef.current = now;

    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      showUI(true);
    });
  }, [cinema, showUI]);

  const tryPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v || isPaused || !videoSrc) return;

    v.muted = muted;
    v.playsInline = true;

    try {
      await v.play();
      setNeedsTapToStart(false);
    } catch (err) {
      console.warn("Video play failed:", err);
      setNeedsTapToStart(true);
      setUiVisible(true);
      clearHideTimer();
    }
  }, [muted, isPaused, videoSrc, clearHideTimer]);

  const changeMonth = useCallback(
    (m: MonthPost) => {
      if (!current || m.id === current.id) return;

      setNeedsTapToStart(false);
      setUiVisible(true);
      scheduleAutoHide();

      setCurrent(m);
      setVideoProgress(0);
      // video перерисуется (key), а tryPlay вызовется из onCanPlay/эффекта
    },
    [current, scheduleAutoHide]
  );

  // Map click -> choose post like months buttons.
  // If already on same region, cycle within that region.
  const selectByRegion = useCallback(
    (regionId: string) => {
      const r = (regionId || "").toLowerCase();
      if (!r || months.length === 0) return;

      const candidates = months.filter((p) => (p.region || "").toLowerCase() === r);
      if (candidates.length === 0) return;

      if (current && (current.region || "").toLowerCase() === r) {
        const idx = candidates.findIndex((p) => p.id === current.id);
        const next = candidates[(idx + 1) % candidates.length];
        if (next) changeMonth(next);
        return;
      }

      changeMonth(candidates[0]);
    },
    [months, current, changeMonth]
  );

  const goNext = useCallback(() => {
    if (!months.length || !current) return;
    const idx = months.findIndex((x) => x.id === current.id);
    if (idx === -1) return;
    const next = months[(idx + 1) % months.length];
    if (next) changeMonth(next);
  }, [months, current, changeMonth]);

  const goPrev = useCallback(() => {
    if (!months.length || !current) return;
    const idx = months.findIndex((x) => x.id === current.id);
    if (idx === -1) return;
    const prev = months[idx === 0 ? months.length - 1 : idx - 1];
    if (prev) changeMonth(prev);
  }, [months, current, changeMonth]);

  const togglePause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isPaused) {
      setIsPaused(false);
      tryPlay();
    } else {
      v.pause();
      setIsPaused(true);
    }
    showUI(true);
  }, [isPaused, tryPlay, showUI]);

  const toggleMuted = useCallback(() => {
    const v = videoRef.current;
    const next = !muted;
    setMuted(next);
    if (v) v.muted = next;
    showUI(true);
  }, [muted, showUI]);

  const toggleCinema = useCallback(() => {
    setCinema((prev) => {
      const next = !prev;
      if (next) {
        setUiVisible(false);
        clearHideTimer();
      } else {
        setUiVisible(true);
        scheduleAutoHide();
      }
      return next;
    });
  }, [clearHideTimer, scheduleAutoHide]);

  // Root click behavior:
  // - if cinema: any click exits cinema (simple!)
  // - else: show UI
  const onRootClick = useCallback(() => {
    if (cinema) {
      setCinema(false);
      setUiVisible(true);
      scheduleAutoHide();
      return;
    }
    showUI(true);
  }, [cinema, scheduleAutoHide, showUI]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePause();
          break;
        case "KeyM":
          toggleMuted();
          break;
        case "KeyC":
          toggleCinema();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "Escape":
          if (cinema) {
            setCinema(false);
            setUiVisible(true);
            scheduleAutoHide();
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePause, toggleMuted, toggleCinema, goNext, goPrev, cinema, scheduleAutoHide]);

  // Autoplay on current change
  useEffect(() => {
    if (!current) return;
    tryPlay();
  }, [current, tryPlay]);

  // Months scroll progress
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setScrollProgress(max > 0 ? (el.scrollLeft / max) * 100 : 0);
      el.classList.toggle("scrolled-to-end", el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    };

    el.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();

    return () => el.removeEventListener("scroll", updateScroll);
  }, [months]);

  // Center active month
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !current) return;
    const btn = el.querySelector<HTMLButtonElement>(`button[data-id="${current.id}"]`);
    if (!btn) return;
    const left = btn.offsetLeft - (el.clientWidth - btn.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [current?.id]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!current) {
    return (
      <div className="home-loading">
        <div className="home-loading-card">
          <div className="home-loading-title">Загрузка…</div>
          <div className="home-loading-sub">Пожалуйста, подождите</div>
        </div>
      </div>
    );
  }

  const preview = clampText(current.content || "", 140);
  const fact = clampText(current.fact || "", 110);

  const onUIEnter = () => {
    interactingRef.current = true;
    showUI(false);
  };
  const onUILeave = () => {
    interactingRef.current = false;
    scheduleAutoHide();
  };

  return (
    <div className={`fs-shell ${theme} ${cinema ? "cinema" : ""}`} onPointerMove={onPointerActivity} onClick={onRootClick}>
      <div className="video-layer">
        <AnimatePresence mode="wait">
          <motion.div
            key={`video-wrap-${current.id}`}
            className="video-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0 }}
          >
            <video
              ref={videoRef}
              className="hero-video"
              muted={muted}
              playsInline
              preload="metadata"
              autoPlay
              onCanPlay={tryPlay}
              // ✅ FIX: автопереход гарантированно работает
              onEnded={() => {
                if (!isPaused) goNext();
              }}
              onTimeUpdate={() => {
                const v = videoRef.current;
                if (!v || !v.duration) return;
                setVideoProgress((v.currentTime / v.duration) * 100);
              }}
            >
              {videoSrc && <source src={videoSrc} type={videoType} />}
            </video>
          </motion.div>
        </AnimatePresence>

        <div className={`overlay ${uiVisible && !cinema ? "overlay-strong" : "overlay-weak"} ${cinema ? "overlay-cinema" : ""}`} />
        <div className={`vignette ${cinema ? "vignette-cinema" : ""}`} />
        <div className="grain" aria-hidden="true" />

        <div className="video-progress-container" aria-hidden="true">
          <div className="video-progress" style={{ width: `${videoProgress}%` }} />
        </div>
      </div>

      <header className={`header ${uiVisible && !cinema ? "" : "hidden-ui"}`} onPointerEnter={onUIEnter} onPointerLeave={onUILeave}>
        <img src={logo} alt="Кыргызстан" className="logo" />
      </header>

      {/* Карта всегда видна; клики не должны “вылетать” в root */}
      <div className={`map-slot ${cinema ? "cinema-hidden" : ""}`} onPointerEnter={onUIEnter} onPointerLeave={onUILeave}>
        <KyrgyzstanMap activeRegion={activeRegion} mapUrl={current.map_url} onSelectRegion={selectByRegion} />
      </div>

      <AnimatePresence>
        {needsTapToStart && !cinema && (
          <motion.div
            className="tap-to-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.96, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={(e) => {
              e.stopPropagation();
              tryPlay();
            }}
          >
            Нажми, чтобы запустить видео
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uiVisible && !cinema && (
          <motion.section className="mini-info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <div className="mini-top">
              <h1 className="mini-title">{current.title || "Кыргызстан"}</h1>
              <div className="mini-badges">
                <span className="badge">{regionLabel(current.region)}</span>
                <span className="badge season">{seasonLabel(current.season)}</span>
              </div>
            </div>
            {fact ? <p className="mini-fact">💡 {fact}</p> : null}
            {preview ? <p className="mini-desc">{preview}</p> : null}
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uiVisible && !cinema && (
          <motion.div className="controls" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
            <button
              className="ctrl-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePause();
              }}
              aria-label={isPaused ? "Воспроизвести" : "Пауза"}
              title={isPaused ? "Play (Space)" : "Pause (Space)"}
            >
              {isPaused ? "▶" : "❚❚"}
            </button>

            <button
              className="ctrl-btn secondary"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMuted();
              }}
              aria-label={muted ? "Включить звук" : "Выключить звук"}
              title="Mute (M)"
            >
              {muted ? "🔇" : "🔊"}
            </button>

            <button
              className="ctrl-btn secondary"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCinema();
              }}
              aria-label="Кино-режим"
              title={cinema ? "Exit cinema (Esc)" : "Cinema (C)"}
            >
              🎬
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className={`months-bar ${uiVisible && !cinema ? "" : "hidden-ui"}`} onClick={(e) => e.stopPropagation()}>
        <div className="months-scroll" ref={scrollRef}>
          {months.map((m) => {
            const active = current.id === m.id;
            return (
              <Tippy key={m.id} content={m.title || ""} placement="top" delay={[250, 0]}>
                <button type="button" data-id={m.id} className={`month-btn ${active ? "active" : ""}`} onClick={() => changeMonth(m)}>
                  {MONTHS_SHORT_RU[(Number(m.id) - 1) % 12] || "???"}
                </button>
              </Tippy>
            );
          })}

          <div className="scroll-hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="scroll-arrow">
              <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="scroll-indicator" aria-hidden="true">
          <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
        </div>
      </footer>

      {/* В кино-режиме показываем простую подсказку (не обязательную для выхода) */}
      <AnimatePresence>
        {cinema && (
          <motion.div className="cinema-hint" initial={{ opacity: 0 }} animate={{ opacity: 0.78 }} exit={{ opacity: 0 }}>
            Тапни в любом месте, чтобы выйти
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}