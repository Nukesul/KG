import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, X } from "lucide-react";
import "../styles/cinematic-discover.css";

type Plan = {
  id: string;
  title: string;
  duration: string;
  price: string;
  image: string;
  vibe: string;
  size: "big" | "medium" | "small";
};

const PLANS: Plan[] = [
  {
    id: "1",
    title: "Иссык-Куль + каньоны",
    duration: "4 дня",
    price: "от 48 000 ₽",
    image: "https://picsum.photos/id/1015/800/600",
    vibe: "Бирюзовое озеро, Джети-Огуз и горячие источники",
    size: "big",
  },
  {
    id: "2",
    title: "Сон-Куль: юрты и кони",
    duration: "5 дней",
    price: "от 52 000 ₽",
    image: "https://picsum.photos/id/1005/800/600",
    vibe: "Высокогорное озеро, ночь в юрте и звёздное небо",
    size: "medium",
  },
  {
    id: "3",
    title: "Ала-Арча у Бишкека",
    duration: "3 дня",
    price: "от 28 000 ₽",
    image: "https://picsum.photos/id/133/800/600",
    vibe: "Мощные горы и треки рядом со столицей",
    size: "small",
  },
  {
    id: "4",
    title: "Арсланбоб и ореховые леса",
    duration: "6 дней",
    price: "от 45 000 ₽",
    image: "https://picsum.photos/id/201/800/600",
    vibe: "Древние леса, водопады и южный колорит",
    size: "medium",
  },
  {
    id: "5",
    title: "Классическое кольцо Кыргызстана",
    duration: "7 дней",
    price: "от 68 000 ₽",
    image: "https://picsum.photos/id/1009/800/600",
    vibe: "Все главные красоты за одну поездку",
    size: "small",
  },
];

export default memo(function CinematicDiscover() {
  const [selected, setSelected] = useState<Plan | null>(null);

  return (
    <section className="kg-section">
      {/* HERO */}
      <div className="kg-hero">
        <div className="relative z-10">
          <h1 className="kg-title">СЕРДЦЕ КЫРГЫЗСТАНА</h1>
          <p className="kg-subtitle">
            От активного отдыха в горах до спокойного релакса у Иссык-Куля
          </p>
        </div>
      </div>

      {/* КРЕАТИВНАЯ ГАЛЕРЕЯ */}
      <div className="kg-gallery">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.id}
            className={`kg-item ${plan.size}`}
            onClick={() => setSelected(plan)}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.09, duration: 0.7 }}
          >
            <img src={plan.image} alt={plan.title} />
            <div className="kg-item-text">
              <div className="kg-item-duration">
                <CalendarDays size={18} />
                {plan.duration}
              </div>
              <h3 className="kg-item-title">{plan.title}</h3>
              <p className="kg-item-vibe">{plan.vibe}</p>
              <div className="kg-item-price">{plan.price}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ПРЕМИУМ МОДАЛЬНОЕ ОКНО */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="kg-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="kg-modal"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopImmediatePropagation()}
            >
              <button
                onClick={() => setSelected(null)}
                style={{ position: "absolute", top: 24, right: 24, zIndex: 10, background: "white", borderRadius: "50%", padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
              >
                <X size={28} />
              </button>

              <img src={selected.image} alt="" style={{ width: "100%", height: "380px", objectFit: "cover" }} />

              <div style={{ padding: "36px" }}>
                <h2 style={{ fontSize: "2.3rem", fontWeight: 900, marginBottom: 8 }}>{selected.title}</h2>
                <p style={{ color: "#d4af77", fontSize: "1.4rem", fontWeight: 700 }}>{selected.duration} • {selected.price}</p>
                <p style={{ marginTop: "24px", fontSize: "1.1rem", lineHeight: 1.75, color: "#333" }}>
                  {selected.vibe}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
});