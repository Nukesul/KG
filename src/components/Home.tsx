import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/home.css";
import CloudParallax from "./CloudParallax"

interface Post {
  id: number;
  title?: string;
  fact?: string;
  region?: string;
  season?: string;
  image_file?: string | null;
}

const PUBLIC_BASE_URL = "https://pub-b2714396445a401c92df408644243348.r2.dev";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    supabase
      .from("posts")
      .select("*")
      .order("id", { ascending: false })
      .then(({ data }) => {
        setPosts(data || []);
        setLoading(false);
      });
  }, []);

  // Автопереключение слайдов каждые 6 секунд
  useEffect(() => {
    if (posts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [posts.length]);

  const getImageUrl = (imageFile: string | null): string => {
    if (!imageFile) return "";
    return imageFile.replace("https://pub-undefined.r2.dev", PUBLIC_BASE_URL);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="no-posts">
        <p>Постов пока нет...</p>
      </div>
    );
  }

  const currentPost = posts[currentIndex];
  const imageUrl = getImageUrl(currentPost?.image_file);

  return (
    <div className="home-page">
      <div className="hero-slider">
        {posts.map((post, index) => {
          const postImageUrl = getImageUrl(post.image_file);
          return (
            <div
              key={post.id}
              className={`hero-slide ${index === currentIndex ? "active" : ""}`}
            >
              {postImageUrl && (
                <img
                  src={postImageUrl}
                  alt={post.title || "Кыргызстан"}
                  className="hero-bg"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              )}

              <div className="hero-overlay" />

              <div className="hero-content">
                <h1 className="hero-title">{post.title || "Без названия"}</h1>

                {post.fact && <p className="hero-fact">{post.fact}</p>}

                {post.region && (
                  <p className="hero-region">
                    {post.region} • {post.season || ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Индикаторы (dots) */}
        {posts.length > 1 && (
          <div className="hero-dots">
            {posts.map((_, idx) => (
              <button
                key={idx}
                className={`hero-dot ${idx === currentIndex ? "active" : ""}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Слайд ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    <CloudParallax />
      
    </div>
  );
}