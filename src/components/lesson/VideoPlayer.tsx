'use client';

import { useState, useEffect } from 'react';
import { Play, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  lessonId: string;
  title: string;
}

export function VideoPlayer({ lessonId, title }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [type, setType] = useState<'iframe' | 'mp4'>('iframe');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchUrl() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/video/${lessonId}`);
        if (!res.ok) throw new Error('Failed to load video');
        const data = await res.json();
        if (!cancelled) {
          setVideoUrl(data.url);
          setType(data.type ?? 'iframe');
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUrl();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-white/40 animate-spin" />
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-center text-white">
        <div>
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Play className="w-12 h-12 text-white/40 ml-1" />
          </div>
          <p className="text-xl font-medium">{title}</p>
          <p className="text-gray-400 mt-2">Video unavailable</p>
        </div>
      </div>
    );
  }

  if (type === 'iframe') {
    return (
      <iframe
        src={videoUrl}
        className="w-full h-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    );
  }

  return (
    <video
      className="w-full h-full"
      controls
      autoPlay={false}
      playsInline
      src={videoUrl}
    />
  );
}
