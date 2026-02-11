import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Tippy from '@tippyjs/react'
import 'tippy.js/dist/tippy.css'

import '../styles/home.css'
import logo from '../assets/logo.png'
import { supabase } from '../lib/supabaseClient'

const VIDEO_BASE_URL = 'https://pub-d90782a2cc9c4ef6903dbc26fa37ea43.r2.dev/'

type MonthPost = {
  id: number
  title: string
  content: string
  video_file: string
  created_at: string
}

function Home() {
  const [months, setMonths] = useState<MonthPost[]>([])
  const [currentMonth, setCurrentMonth] = useState<MonthPost | null>(null)

  const [isFading, setIsFading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const currentVideoRef = useRef<HTMLVideoElement>(null)

  const [scrollProgress, setScrollProgress] = useState(0)

  /* -------------------------
     🔥 LOAD DATA FROM SUPABASE
  ------------------------- */
  useEffect(() => {
    const loadPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('id', { ascending: true })

      if (error) {
        console.error('Supabase load error:', error)
        return
      }

      if (data && data.length > 0) {
        setMonths(data as MonthPost[])
        setCurrentMonth(data[0] as MonthPost)
      } else {
        console.warn('No posts found in Supabase table "posts".')
      }
    }

    loadPosts()
  }, [])

  /* -------------------------
     VIDEO CHANGE
  ------------------------- */
  const handleMonthChange = (month: MonthPost) => {
    if (!currentMonth || month.id === currentMonth.id) return

    setIsFading(true)

    setTimeout(() => {
      setCurrentMonth(month)
      setIsFading(false)

      if (currentVideoRef.current) {
        currentVideoRef.current.load()
        if (!isPaused) currentVideoRef.current.play().catch(() => {})
      }
    }, 600)
  }

  const handleVideoEnded = () => {
    if (!months.length || !currentMonth || isPaused) return

    const index = months.findIndex(m => m.id === currentMonth.id)
    const nextIndex = (index + 1) % months.length

    handleMonthChange(months[nextIndex])
  }

  const togglePause = () => {
    if (!currentVideoRef.current) return

    if (isPaused) {
      currentVideoRef.current.play().catch(() => {})
    } else {
      currentVideoRef.current.pause()
    }

    setIsPaused(!isPaused)
  }

  /* -------------------------
     SCROLL PROGRESS
  ------------------------- */
  useEffect(() => {
    const elem = scrollRef.current
    if (!elem) return

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = elem
      const max = scrollWidth - clientWidth
      setScrollProgress(max > 0 ? scrollLeft / max : 0)
      elem.classList.toggle('scrolled-to-end', scrollLeft + clientWidth >= scrollWidth - 10)
    }

    elem.addEventListener('scroll', update, { passive: true })
    update()

    return () => elem.removeEventListener('scroll', update)
  }, [])

  if (!currentMonth) return null

  const videoSrc = `${VIDEO_BASE_URL}${currentMonth.video_file}`
  const videoType = currentMonth.video_file?.toLowerCase().endsWith('.webm')
    ? 'video/webm'
    : 'video/mp4'

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
            <source src={videoSrc} type={videoType} />
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
              {/* Если ты хочешь вернуть fact tooltip — просто добавь колонку fact в Supabase и оберни h1 в <Tippy /> */}
              <Tippy content="" disabled>
                <h1 className="main-title">{currentMonth.title}</h1>
              </Tippy>
              <p className="subtitle">Горы. Озёра. Традиции.</p>
              <p className="description">{currentMonth.content}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="controls">
          <button onClick={togglePause} aria-label={isPaused ? 'Воспроизвести' : 'Пауза'}>
            {isPaused ? '▶' : '❚❚'}
          </button>
        </div>

        <nav className="months-bar">
          <div className="months-scroll" ref={scrollRef}>
            {months.map((m, i) => (
              <button
                key={m.id}
                className={`month-btn ${currentMonth.id === m.id ? 'active' : ''}`}
                onClick={() => handleMonthChange(m)}
                aria-label={m.title}
              >
                <span className="full-name">{m.title}</span>
                <span className="short-name">{i + 1}</span>
              </button>
            ))}

            <div className="scroll-hint">
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

          <div className="scroll-indicator">
            <div className="scroll-progress" style={{ width: `${scrollProgress * 100}%` }} />
          </div>
        </nav>
      </main>
    </>
  )
}

export default Home
