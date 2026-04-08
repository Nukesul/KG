// src/pages/Home.tsx
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const MONTHS_SHORT_RU = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

function useViewportCSSVar() {
  useLayoutEffect(() => {
    const setVars = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${h}px`);
    };
    setVars();
    window.addEventListener("resize", setVars, { passive: true });
    window.visualViewport?.addEventListener("resize", setVars, { passive: true });
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
  const map: Record<string, string> = {
    winter: "Зима",
    spring: "Весна",
    summer: "Лето",
    autumn: "Осень",
  };
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

function useRafThrottled<T extends (...args: any[]) => void>(fn: T) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const rafRef = useRef<number | null>(null);
  const lastArgsRef = useRef<any[] | null>(null);

  return useCallback((...args: any[]) => {
    lastArgsRef.current = args;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const a = lastArgsRef.current || [];
      fnRef.current(...a);
    });
  }, []);
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
  const [headerVisible, setHeaderVisible] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactingRef = useRef(false);

  const uiRafRef = useRef<number | null>(null);
  const lastShowTsRef = useRef<number>(0);

  const videoProgressElRef = useRef<HTMLDivElement>(null);
  const scrollProgressElRef = useRef<HTMLDivElement>(null);

  // Header scroll (cheap)
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHeaderVisible(y <= lastScrollY);
      lastScrollY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load posts
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("id", { ascending: true });

        if (!alive) return;

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
    return () => {
      alive = false;
    };
  }, []);

  const activeRegion = useMemo(
    () => (current?.region || "").toLowerCase() || null,
    [current?.region]
  );

  const videoSrc = useMemo(
    () => (current?.video_file ? `${VIDEO_BASE_URL}${current.video_file}` : null),
    [current?.video_file]
  );

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
    if (!hideTimerRef.current) return;
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const scheduleAutoHide = useCallback(() => {
    if (cinema || needsTapToStart) return;
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (interactingRef.current) return;
      setUiVisible(false);
    }, 2500);
  }, [cinema, needsTapToStart, clearHideTimer]);

  const showUI = useCallback(
    (autoHide = true) => {
      if (cinema) return;
      setUiVisible(true);
      clearHideTimer();
      if (autoHide) scheduleAutoHide();
    },
    [cinema, clearHideTimer, scheduleAutoHide]
  );

  const onPointerActivity = useCallback(() => {
    if (cinema) return;
    const now = performance.now();
    if (now - lastShowTsRef.current < 140) return;
    lastShowTsRef.current = now;

    if (uiRafRef.current) return;
    uiRafRef.current = requestAnimationFrame(() => {
      uiRafRef.current = null;
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

      // сброс прогресса без setState (без перерендеров)
      if (videoProgressElRef.current) videoProgressElRef.current.style.width = "0%";
    },
    [current, scheduleAutoHide]
  );

  const selectByRegion = useCallback(
    (regionId: string) => {
      const r = (regionId || "").toLowerCase();
      if (!r || months.length === 0) return;

      const candidates = months.filter(
        (p) => (p.region || "").toLowerCase() === r
      );
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

  // Months scroll progress (rAF throttled, no spam setState)
  const updateScrollProgress = useRafThrottled(() => {
    const el = scrollRef.current;
    if (!el || !scrollProgressElRef.current) return;
    const max = el.scrollWidth - el.clientWidth;
    const pct = max > 0 ? (el.scrollLeft / max) * 100 : 0;
    scrollProgressElRef.current.style.width = `${pct}%`;
    el.classList.toggle(
      "scrolled-to-end",
      el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
    );
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollProgress, { passive: true });
    updateScrollProgress();
    return () => el.removeEventListener("scroll", updateScrollProgress);
  }, [months, updateScrollProgress]);

  // Center active month
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !current) return;
    const btn = el.querySelector<HTMLButtonElement>(
      `button[data-id="${current.id}"]`
    );
    if (!btn) return;
    const left = btn.offsetLeft - (el.clientWidth - btn.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [current?.id]);

  // Video progress (rAF throttled, no setState)
  const updateVideoProgress = useRafThrottled(() => {
    const v = videoRef.current;
    const bar = videoProgressElRef.current;
    if (!v || !bar || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    bar.style.width = `${pct}%`;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (uiRafRef.current) cancelAnimationFrame(uiRafRef.current);
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
    <div
      className={`fs-shell ${theme} ${cinema ? "cinema" : ""}`}
      onPointerMove={onPointerActivity}
      onClick={onRootClick}
    >
      <div className="video-layer">
        <AnimatePresence mode="wait">
          <motion.div
            key={`video-wrap-${current.id}`}
            className="video-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0 }}
          >
            <video
              key={`video-${current.id}`}
              ref={videoRef}
              className="hero-video"
              muted={muted}
              playsInline
              preload="metadata"
              autoPlay
              onCanPlay={tryPlay}
              onEnded={() => {
                if (!isPaused) goNext();
              }}
              onTimeUpdate={updateVideoProgress}
            >
              {videoSrc && <source src={videoSrc} type={videoType} />}
            </video>
          </motion.div>
        </AnimatePresence>

        <div
          className={`overlay ${
            uiVisible && !cinema ? "overlay-strong" : "overlay-weak"
          } ${cinema ? "overlay-cinema" : ""}`}
        />
        <div className={`vignette ${cinema ? "vignette-cinema" : ""}`} />
        <div className="grain" aria-hidden="true" />

        <div className="video-progress-container" aria-hidden="true">
          <div className="video-progress" ref={videoProgressElRef} style={{ width: "0%" }} />
        </div>
      </div>

      <header
        className={`header ${uiVisible && !cinema ? "" : "hidden-ui"} ${
          headerVisible ? "" : "header-scroll-hidden"
        }`}
        onPointerEnter={onUIEnter}
        onPointerLeave={onUILeave}
      >
        <img src={logo} alt="Кыргызстан" className="logo" />
      </header>

      {/* ВАЖНО: стопаем bubbling, иначе клики по карте будут триггерить root */}
      <div
        className={`map-slot ${cinema ? "cinema-hidden" : ""}`}
        onPointerEnter={onUIEnter}
        onPointerLeave={onUILeave}
        onClick={(e) => e.stopPropagation()}
      >
        <KyrgyzstanMap
          activeRegion={activeRegion}
          mapUrl={current.map_url}
          onSelectRegion={selectByRegion}
        />
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
          <motion.section
            className="mini-info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            onPointerEnter={onUIEnter}
            onPointerLeave={onUILeave}
          >
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
          <motion.div
            className="controls"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={(e) => e.stopPropagation()}
            onPointerEnter={onUIEnter}
            onPointerLeave={onUILeave}
          >
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

      <footer
        className={`months-bar ${uiVisible && !cinema ? "" : "hidden-ui"}`}
        onClick={(e) => e.stopPropagation()}
        onPointerEnter={onUIEnter}
        onPointerLeave={onUILeave}
      >
        <div className="months-scroll" ref={scrollRef}>
          {months.map((m) => {
            const active = current.id === m.id;
            return (
              <Tippy key={m.id} content={m.title || ""} placement="top" delay={[250, 0]}>
                <button
                  type="button"
                  data-id={m.id}
                  className={`month-btn ${active ? "active" : ""}`}
                  onClick={() => changeMonth(m)}
                >
                  {MONTHS_SHORT_RU[(Number(m.id) - 1) % 12] || "???"}
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
          <div className="scroll-progress" ref={scrollProgressElRef} style={{ width: "0%" }} />
        </div>
      </footer>

      <AnimatePresence>
        {cinema && (
          <motion.div
            className="cinema-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.78 }}
            exit={{ opacity: 0 }}
          >
            Тапни в любом месте, чтобы выйти
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}