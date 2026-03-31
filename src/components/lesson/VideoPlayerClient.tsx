'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const VideoPlayer = dynamic(
  () => import('./VideoPlayer').then(m => m.VideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-white/40 animate-spin" />
      </div>
    ),
  }
);
