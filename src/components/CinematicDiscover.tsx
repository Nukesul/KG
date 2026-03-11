import { motion } from "framer-motion";
import { Mountain, Waves, Tent, Star } from "lucide-react";

import "../styles/cinematic-discover.css";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stats = [
  { icon: Mountain, number: "94%", label: "горы" },
  { icon: Waves, number: "2000+", label: "озёр" },
  { icon: Tent, number: "6000 лет", label: "кочевой культуры" },
  { icon: Star, number: "TOP", label: "звёздное небо мира" },
];

export default function CinematicDiscover() {
  return (
    <section className="cinematic-discover">
      <motion.div
        className="quote-section"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <h1>
          Некоторые места просто посещают.
          <br />
          Кыргызстан — проживают.
        </h1>
      </motion.div>
      <motion.div
        className="stats-section"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            className="stat-card"
            variants={childVariants}
            whileHover={{ y: -10, transition: { duration: 0.3 } }}
          >
            <stat.icon size={48} className="stat-icon" />
            <h2 className="stat-number">{stat.number}</h2>
            <p className="stat-label">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}