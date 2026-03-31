'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  lessonId: string;
  title: string;
}

export function VideoPlayer({ lessonId, title }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [type, setType] = useState<'hls' | 'mp4'>('mp4');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

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
          setType(data.type ?? 'mp4');
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUrl();

    const interval = setInterval(fetchUrl, 90 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [lessonId]);

  // Set up HLS when we have a Stream URL
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    if (type === 'hls') {
      hlsRef.current?.destroy();

      (async () => {
        const { default: Hls } = await import('hls.js');
        if (!videoRef.current) return;
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(videoUrl);
          hls.attachMedia(videoRef.current);
          hlsRef.current = hls;
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS (Safari)
          videoRef.current.src = videoUrl;
        }
      })();
    } else {
      videoRef.current.src = videoUrl;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl, type]);

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

  return (
    <video
      ref={videoRef}
      className="w-full h-full"
      controls
      autoPlay={false}
      playsInline
    />
  );
}
