'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy certificate link"
      className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
      <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
    </button>
  );
}
