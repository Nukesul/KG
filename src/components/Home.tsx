import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/home.css";

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const PUBLIC_BASE_URL = "https://pub-b2714396445a401c92df408644243348.r2.dev";

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

  const getImageUrl = (imageFile: string | null) => {
    if (!imageFile) return "";
    return imageFile.replace("https://pub-undefined.r2.dev", PUBLIC_BASE_URL);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="home-page">
      {posts.length === 0 ? (
        <div className="no-posts">
          <p>Постов пока нет...</p>
        </div>
      ) : (
        posts.map((post) => {
          const imageUrl = getImageUrl(post?.image_file);

          return (
            <div key={post?.id} className="hero-slide">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={post?.title || "Кыргызстан"}
                  className="hero-bg"
                  loading="lazy"
                />
              )}

              <div className="hero-overlay"></div>

              <div className="hero-content">
                <h1 className="hero-title">{post?.title || "Без названия"}</h1>
                
                {post?.fact && (
                  <p className="hero-fact">{post.fact}</p>
                )}

                {post?.region && (
                  <p className="hero-region">
                    {post.region} • {post.season || ""}
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}