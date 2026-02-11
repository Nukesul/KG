import { useState, useRef, useEffect, useMemo } from "react";
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

function useViewportFix() {
  useEffect(() => {
    const setVh = () => {
      // Используем визуальный viewport если есть (iOS Safari)
      const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVh();
    window.addEventListener("resize", setVh);
    window.visualViewport?.addEventListener("resize", setVh);
    window.visualViewport?.addEventListener("scroll", setVh);

    return () => {
      window.removeEventListener("resize", setVh);
      window.visualViewport?.removeEventListener("resize", setVh);
      window.visualViewport?.removeEventListener("scroll", setVh);
    };
  }, []);
}

export default function Home() {
  useViewportFix();

  const [months, setMonths] = useState<MonthPost[]>([]);
  const [currentMonth, setCurrentMonth] = useState<MonthPost | null>(null);

  const [isFading, setIsFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentVideoRef = useRef<HTMLVideoElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);

  // LOAD DATA
  useEffect(() => {
    const loadPosts = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Supabase load error:", error);
        return;
      }

      if (data && data.length > 0) {
        setMonths(data as MonthPost[]);
        setCurrentMonth(data[0] as MonthPost);
      }
    };

    loadPosts();
  }, []);

  const videoSrc = useMemo(() => {
    if (!currentMonth) return "";
    return `${VIDEO_BASE_URL}${currentMonth.video_file}`;
  }, [currentMonth]);

  const videoType = useMemo(() => {
    if (!currentMonth?.video_file) return "video/mp4";
    return currentMonth.video_file.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
  }, [currentMonth]);

  // VIDEO CHANGE
  const handleMonthChange = (month: MonthPost) => {
    if (!currentMonth || month.id === currentMonth.id) return;

    setIsFading(true);

    window.setTimeout(() => {
      setCurrentMonth(month);
      setIsFading(false);

      const v = currentVideoRef.current;
      if (v) {
        v.load();
        if (!isPaused) v.play().catch(() => {});
      }
    }, 450);
  };

  const handleVideoEnded = () => {
    if (!months.length || !currentMonth || isPaused) return;

    const index = months.findIndex((m) => m.id === currentMonth.id);
    const nextIndex = (index + 1) % months.length;
    handleMonthChange(months[nextIndex]);
  };

  const togglePause = () => {
    const v = currentVideoRef.current;
    if (!v) return;

    if (isPaused) v.play().catch(() => {});
    else v.pause();

    setIsPaused((p) => !p);
  };

  // SCROLL PROGRESS
  useEffect(() => {
    const elem = scrollRef.current;
    if (!elem) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = elem;
      const max = scrollWidth - clientWidth;
      setScrollProgress(max > 0 ? scrollLeft / max : 0);

      elem.classList.toggle("scrolled-to-end", scrollLeft + clientWidth >= scrollWidth - 10);
      elem.classList.toggle("scrolled-to-start", scrollLeft <= 2);
    };

    elem.addEventListener("scroll", update, { passive: true });
    update();

    return () => elem.removeEventListener("scroll", update);
  }, [months.length]);

  if (!currentMonth) return null;

  return (
    <>
      <header className="header">
        <div className="logo-wrapper">
          <img src={logo} alt="Кыргызстан" className="logo" />
        </div>
      </header>

      <main className="hero">
        <div className="video-container">
          <motion.video
            ref={currentVideoRef}
            className={`hero-video ${isFading ? "fade-out" : "fade-in"}`}
            autoPlay={!isPaused}
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            onError={(e) => console.error("Video load error:", e)}
            key={`video-${currentMonth.id}`}
          >
            <source src={videoSrc} type={videoType} />
          </motion.video>
        </div>

        <div className="hero-overlay" />

        <section className="title-corner" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${currentMonth.id}`}
              className="title-group"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <Tippy content="" disabled>
                <h1 className="main-title">{currentMonth.title}</h1>
              </Tippy>
              <p className="subtitle">Горы. Озёра. Традиции.</p>
              <p className="description">{currentMonth.content}</p>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* FIX: controls держим над нижней панелью + safe-area */}
        <div className="controls">
          <button onClick={togglePause} aria-label={isPaused ? "Воспроизвести" : "Пауза"}>
            {isPaused ? "▶" : "❚❚"}
          </button>
        </div>

        {/* FIX: нижняя панель фиксированная (не absolute внутри hero) */}
        <nav className="months-bar" aria-label="Месяцы">
          <div className="months-scroll" ref={scrollRef}>
            {months.map((m, i) => (
              <button
                key={m.id}
                className={`month-btn ${currentMonth.id === m.id ? "active" : ""}`}
                onClick={() => handleMonthChange(m)}
                aria-label={m.title}
                type="button"
              >
                <span className="full-name">{m.title}</span>
                <span className="short-name">{i + 1}</span>
              </button>
            ))}

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
        </nav>
      </main>
    </>
  );
}
