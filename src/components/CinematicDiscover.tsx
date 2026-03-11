import React, { memo } from "react";
import { motion, type Variants } from "framer-motion";
import { Mountain, Waves, Tent, Star, ArrowRight } from "lucide-react";
import "../styles/cinematic-discover.css";

type Stat = {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  number: string;
  label: string;
  short: string;
  description: string;
};

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.12,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const STATS: Stat[] = [
  {
    id: "mountains",
    icon: Mountain,
    number: "94%",
    label: "горные ландшафты",
    short: "Вершины, ущелья и перевалы — ощущение масштаба.",
    description:
      "Почти вся страна — драматичный рельеф: перевалы, ущелья и вершины, которые дают мощное чувство высоты и простора.",
  },
  {
    id: "lakes",
    icon: Waves,
    number: "2000+",
    label: "озёр и водоёмов",
    short: "От Иссык-Куля до зеркальных высокогорных озёр.",
    description:
      "От легендарного Иссык-Куля до зеркальных высокогорных озёр среди тишины, ветра и редкой чистоты пространства.",
  },
  {
    id: "nomads",
    icon: Tent,
    number: "6000 лет",
    label: "кочевой истории",
    short: "Юрты, традиции, эпос и гостеприимство — живое.",
    description:
      "Живая культура: юрты, традиции, эпос, гостеприимство и связь с природой — это ощущается не как музей, а как настоящее.",
  },
  {
    id: "sky",
    icon: Star,
    number: "TOP",
    label: "небо для наблюдений",
    short: "Высота и чистый воздух — почти нет светового шума.",
    description:
      "Чистый воздух, высота и удалённость от мегаполисов создают редкую атмосферу для наблюдения за ночным небом.",
  },
];

function CinematicDiscover() {
  return (
    <section className="cd" aria-label="Discover Kyrgyzstan">
      <div className="cd__bg" aria-hidden="true">
        <div className="cd__glow cd__glow--a" />
        <div className="cd__glow cd__glow--b" />
        <div className="cd__grid" />
        <div className="cd__noise" />
      </div>

      <motion.div
        className="cd__inner"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header className="cd-hero" variants={fadeUp}>
          <div className="cd-badge" aria-label="Badge">
            <span className="cd-badge__dot" aria-hidden="true" />
            Discover Kyrgyzstan
          </div>

          <motion.p className="cd-kicker" variants={fadeUp}>
            Там, где природа звучит громче слов
          </motion.p>

          <motion.h1 className="cd-title" variants={fadeUp}>
            Некоторые места
            <br />
            просто посещают.
            <br />
            <span>Кыргызстан — проживают.</span>
          </motion.h1>

          <motion.p className="cd-desc" variants={fadeUp}>
            Это не просто точка на карте. Это пространство света, высоты, холодных
            озёр и чувства свободы, которое остаётся намного дольше самого путешествия.
          </motion.p>

          <motion.div className="cd-actions" variants={fadeUp}>
            <button className="cd-btn cd-btn--primary" type="button" aria-label="Исследовать направление">
              Исследовать направление <ArrowRight size={18} />
            </button>
            <div className="cd-note">
              Настоящая природа. Настоящая тишина. Настоящие эмоции.
            </div>
          </motion.div>
        </motion.header>

        <motion.div className="cd-mobile-overview" variants={fadeUp} aria-label="Короткие факты">
          <div className="cd-mobile-overview__item">
            <span className="cd-mobile-overview__value">94%</span>
            <span className="cd-mobile-overview__label">горы</span>
          </div>
          <div className="cd-mobile-overview__item">
            <span className="cd-mobile-overview__value">2000+</span>
            <span className="cd-mobile-overview__label">озёр</span>
          </div>
          <div className="cd-mobile-overview__item">
            <span className="cd-mobile-overview__value">6000 лет</span>
            <span className="cd-mobile-overview__label">культуры</span>
          </div>
        </motion.div>

        <motion.div className="cd-stats" variants={containerVariants} aria-label="Факты о Кыргызстане">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.article
                key={stat.id}
                className="cd-card"
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <div className="cd-card__top">
                  <div className="cd-icon">
                    <Icon size={26} className="cd-icon__svg" />
                  </div>
                  <div className="cd-line" aria-hidden="true" />
                </div>

                <div className="cd-card__body">
                  <h2 className="cd-number">{stat.number}</h2>
                  <h3 className="cd-label">{stat.label}</h3>

                  <p className="cd-text cd-text--mobile">{stat.short}</p>
                  <p className="cd-text cd-text--desktop">{stat.description}</p>
                </div>
              </motion.article>
            );
          })}
        </motion.div>

        <motion.div className="cd-hint" variants={fadeUp} aria-hidden="true">
          Проведите влево, чтобы посмотреть больше
        </motion.div>

        <motion.footer className="cd-bottom" variants={fadeUp}>
          <div className="cd-bottom__left">
            <span className="cd-overline">Впечатление, а не маршрут</span>
            <p>
              Кыргызстан ощущается не как поездка, а как состояние: простор, высота,
              ветер, огонь, вода и тишина, которую невозможно забыть.
            </p>
          </div>

          <div className="cd-bottom__right">
            <div className="cd-metric" aria-label="Ощущение свободы">
              <span className="cd-metric__value">∞</span>
              <span className="cd-metric__label">ощущение свободы</span>
            </div>
          </div>
        </motion.footer>
      </motion.div>
    </section>
  );
}

export default memo(CinematicDiscover);
