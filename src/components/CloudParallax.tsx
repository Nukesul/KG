import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import "../styles/cloud-parallax.css"
export default function CloudParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // Разные скорости для слоёв (чем больше число — тем быстрее двигается)
  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const y3 = useTransform(scrollYProgress, [0, 1], ["0%", "65%"]);

  return (
    <div ref={ref} className="cloud-parallax-container">
      {/* Самый дальний слой (медленный + более мутный) */}
      <motion.div className="cloud-layer layer-1" style={{ y: y1 }} />
      {/* Средний слой */}
      <motion.div className="cloud-layer layer-2" style={{ y: y2 }} />
      {/* Ближний слой + туман */}
      <motion.div className="cloud-layer layer-3" style={{ y: y3 }} />

      {/* Дополнительная мутность (туман) */}
      <div className="fog" />
    </div>
  );
}