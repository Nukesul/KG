import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import '../styles/home.css';
import logo from '../assets/logo.png';

const VIDEO_BASE_URL = 'https://pub-d90782a2cc9c4ef6903dbc26fa37ea43.r2.dev/';

const months = [
  { id: 1, name: 'Январь',   short: 'Янв', video: 'jan.mp4', title: 'Январь в Кыргызстане',     description: 'Снежные пики и лыжи в Караколе. -10°C до 0°C.',     fact: 'Иссык-Куль не замерзает зимой — идеально для катания на коньках среди гор.' },
  { id: 2, name: 'Февраль',  short: 'Фев', video: 'feb.mp4', title: 'Февраль в Кыргызстане',    description: 'Горнолыжки и фестивали. -8°C до +2°C.',              fact: 'Февраль — время снежных игр и традиционных фестивалей на свежем воздухе.' },
  { id: 3, name: 'Март',     short: 'Мар', video: 'mar.mp4', title: 'Март в Кыргызстане',        description: 'Навруз и весенние цветы. 0°C до +10°C.',             fact: 'Навруз — праздник обновления с танцами и национальными угощениями.' },
  { id: 4, name: 'Апрель',   short: 'Апр', video: 'apr.mp4', title: 'Апрель в Кыргызстане',      description: 'Цветущие луга и рафтинг. +5°C до +15°C.',            fact: 'Весенние реки — отличное место для рафтинга и фото природы.' },
  { id: 5, name: 'Май',      short: 'Май', video: 'may.mp4', title: 'Май в Кыргызстане',         description: 'Трекинг и пикники. +10°C до +20°C.',                 fact: 'Май — сезон номадов: узнайте секреты кочевой жизни.' },
  { id: 6, name: 'Июнь',     short: 'Июн', video: 'jun.mp4', title: 'Июнь в Кыргызстане',        description: 'Пляжи Иссык-Куля. +15°C до +25°C.',                  fact: 'Иссык-Куль — "горячее озеро" с теплой водой среди Альп.' },
  { id: 7, name: 'Июль',     short: 'Июл', video: 'jul.mp4', title: 'Июль в Кыргызстане',        description: 'Юрты и Тянь-Шань. +18°C до +28°C.',                  fact: 'Живите в юртах и пробуйте свежие фрукты с базаров.' },
  { id: 8, name: 'Август',   short: 'Авг', video: 'aug.mp4', title: 'Август в Кыргызстане',      description: 'Озера и урожай. +15°C до +25°C.',                    fact: 'Август — время урожая и культурных фестивалей.' },
  { id: 9, name: 'Сентябрь', short: 'Сен', video: 'sep.mp4', title: 'Сентябрь в Кыргызстане',    description: 'Осенний трекинг. +10°C до +20°C.',                   fact: 'Золотые листья — идеально для трекинга без толпы.' },
  { id:10, name: 'Октябрь',  short: 'Окт', video: 'oct.mp4', title: 'Октябрь в Кыргызстане',     description: 'Красочные леса. +5°C до +15°C.',                     fact: 'Осень в горах — время для сбора грибов и фото.' },
  { id:11, name: 'Ноябрь',   short: 'Ноя', video: 'nov.mp4', title: 'Ноябрь в Кыргызстане',      description: 'Экскурсии и снега. 0°C до +10°C.',                   fact: 'Ноябрь — для городских экскурсий в Бишкеке.' },
  { id:12, name: 'Декабрь',  short: 'Дек', video: 'dec.mp4', title: 'Декабрь в Кыргызстане',     description: 'Фестивали и снег. -5°C до +5°C.',                    fact: 'Новогодние юрты с самоваром и праздниками.' },
];

function Home() {
  const [currentMonth, setCurrentMonth] = useState(months[0]);
  const [isFading, setIsFading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const currentVideoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // ==================== useEffects ====================
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  const handleMonthChange = (month: typeof months[0]) => {
    if (month.id === currentMonth.id) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentMonth(month);
      setIsFading(false);
      if (currentVideoRef.current) {
        currentVideoRef.current.load();
        if (!isPaused) currentVideoRef.current.play().catch(() => {});
      }
    }, 600);
  };

  const handleVideoEnded = () => {
    if (isPaused) return;
    let nextId = currentMonth.id + 1;
    if (nextId > 12) nextId = 1;
    const nextMonth = months.find(m => m.id === nextId)!;
    handleMonthChange(nextMonth);
  };

  const togglePause = () => {
    if (currentVideoRef.current) {
      isPaused ? currentVideoRef.current.play().catch(() => {}) : currentVideoRef.current.pause();
      setIsPaused(!isPaused);
    }
  };

  useEffect(() => {
    const elem = scrollRef.current;
    if (!elem) return;

    const updateProgress = () => {
      const { scrollLeft, scrollWidth, clientWidth } = elem;
      const maxScroll = scrollWidth - clientWidth;
      const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
      setScrollProgress(progress);
      elem.classList.toggle('scrolled-to-end', scrollLeft + clientWidth >= scrollWidth - 10);
    };

    elem.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    return () => elem.removeEventListener('scroll', updateProgress);
  }, []);

  // Parallax (только десктоп, улучшено для плавности)
  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container || 'ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    let targetX = 0, targetY = 0, targetScale = 1;
    let currentX = 0, currentY = 0, currentScale = 1;
    let rafId: number | null = null;
    let isActive = false;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      let x = (e.clientX - rect.left) / rect.width - 0.5;
      let y = (e.clientY - rect.top) / rect.height - 0.5;
      const dist = Math.hypot(x, y);
      const curve = 1 + dist * 0.08;
      targetX = x * curve * 8;
      targetY = y * curve * 8;
      targetScale = 1 + dist * 0.015;
    };

    const animate = () => {
      if (!isActive) return;
      currentX += (targetX - currentX) * 0.25;
      currentY += (targetY - currentY) * 0.25;
      currentScale += (targetScale - currentScale) * 0.25;

      container.querySelectorAll('.hero-video').forEach(el => {
        (el as HTMLElement).style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
      });

      rafId = requestAnimationFrame(animate);
    };

    const onEnter = () => { isActive = true; animate(); };
    const onLeave = () => {
      isActive = false;
      targetX = targetY = targetScale = 0;
      animate();
      if (rafId) cancelAnimationFrame(rafId);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', onEnter);
      container.removeEventListener('mouseleave', onLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Preload следующего видео и улучшено для нескольких вперед
  useEffect(() => {
    const preloadVideos = [currentMonth.id % 12 + 1, (currentMonth.id + 1) % 12 + 1];
    preloadVideos.forEach(id => {
      const video = months.find(m => m.id === id)!.video;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'fetch';
      link.href = `${VIDEO_BASE_URL}${video}`;
      document.head.appendChild(link);
    });

    if (currentVideoRef.current) {
      currentVideoRef.current.poster = `${VIDEO_BASE_URL}${currentMonth.video.replace('.mp4', '.jpg')}`;
    }

    return () => {
      preloadVideos.forEach(id => {
        const video = months.find(m => m.id === id)!.video;
        const links = document.querySelectorAll(`link[href="${VIDEO_BASE_URL}${video}"]`);
        links.forEach(link => document.head.removeChild(link));
      });
    };
  }, [currentMonth]);

  return (
    <>
      <header className="header">
        <div className="logo-wrapper">
          <img src={logo} alt="Кыргызстан" className="logo" />
        </div>
      </header>

      <main className="hero">
        <div className="video-container" ref={videoContainerRef}>
          <motion.video
            ref={currentVideoRef}
            className={`hero-video ${isFading ? 'fade-out' : 'fade-in'}`}
            autoPlay={!isPaused}
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            onError={e => console.error('Video load error:', e)}
            key={`video-${currentMonth.id}`}
          >
            <source src={`${VIDEO_BASE_URL}${currentMonth.video}`} type="video/mp4" />
          </motion.video>
        </div>

        <div className="hero-overlay" />

        <div className="title-corner">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${currentMonth.id}`}
              className="title-group"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Tippy content={currentMonth.fact} placement="bottom" animation="fade" duration={300}>
                <h1 className="main-title">{currentMonth.title}</h1>
              </Tippy>
              <p className="subtitle">Горы. Озёра. Традиции.</p>
              <p className="description">{currentMonth.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="controls">
          <button onClick={togglePause} aria-label={isPaused ? "Воспроизвести" : "Пауза"}>
            {isPaused ? '▶' : '❚❚'}
          </button>
        </div>

        <nav className="months-bar">
          <div className="months-scroll" ref={scrollRef}>
            {months.map(month => (
              <button
                key={month.id}
                className={`month-btn ${currentMonth.id === month.id ? 'active' : ''}`}
                onClick={() => handleMonthChange(month)}
                aria-label={month.name}
              >
                <span className="full-name">{month.name}</span>
                <span className="short-name">{month.short}</span>
              </button>
            ))}
            <div className="scroll-hint">
              <svg viewBox="0 0 24 24" className="scroll-arrow">
                <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="scroll-indicator">
            <div className="scroll-progress" style={{ width: `${scrollProgress * 100}%` }} />
          </div>
        </nav>
      </main>
    </>
  );
}

export default Home;