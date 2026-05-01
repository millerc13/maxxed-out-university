'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Share2,
  ExternalLink,
  GraduationCap,
  Sparkles,
  CreditCard,
  Globe,
  Building2,
  TrendingUp,
  Zap as ZapIcon,
  Rocket,
  LogIn,
  Check,
  X,
  Download,
  type LucideIcon,
} from 'lucide-react';

type Tab = 'funnels' | 'university' | 'payments';

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  thumbnail: string | null;
}

interface QuickLinksClientProps {
  universityOrigin: string;
  courses: CourseRow[];
}

interface Card {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  accent: AccentKey;
  badge?: string;
}

type AccentKey = 'blue' | 'amber' | 'emerald' | 'violet' | 'gray';

// Funnel subdomains are static — same in dev/prod, just owned at GoDaddy
// → Vercel. Hardcoding the production URLs because that's what gets
// printed on cards / texted to leads at the event. Order is the
// canonical "what Todd reaches for first" sequence (apply-flow programs
// surface above the direct-buy Blueprint).
const FUNNEL_URLS: Card[] = [
  { id: 'mentorship', title: '6-Month Mentorship', url: 'https://mentorship.maxxedout.com', icon: Rocket, accent: 'amber' },
  { id: 'business-mentorship', title: 'Business Accelerator & Mentorship', url: 'https://business-mentorship.maxxedout.com', icon: TrendingUp, accent: 'emerald' },
  { id: 'accelerator', title: 'Business Accelerator', url: 'https://accelerator.maxxedout.com', icon: ZapIcon, accent: 'violet' },
  { id: 'blueprint', title: 'Real Estate Empire Blueprint', url: 'https://blueprint.maxxedout.com', icon: Building2, accent: 'blue' },
];

// Display order for the Payments tab — matches the funnel order above
// using course slugs. Anything not in this list falls to the end,
// then sorted by price desc (existing behavior for new courses).
const PAYMENT_SLUG_ORDER: string[] = [
  '6-month-mentorship',
  'business-accelerator-mentorship',
  'business-accelerator',
  'real-estate-empire-blueprint',
];

export function QuickLinksClient({ universityOrigin, courses }: QuickLinksClientProps) {
  const [tab, setTab] = useState<Tab>('funnels');
  const [enlargedCard, setEnlargedCard] = useState<Card | null>(null);

  const universityCards: Card[] = [
    { id: 'home', title: 'University Home', url: universityOrigin, icon: GraduationCap, accent: 'blue' },
    { id: 'courses', title: 'All Courses', url: `${universityOrigin}/courses`, icon: Globe, accent: 'blue' },
    { id: 'login', title: 'Login', url: `${universityOrigin}/login`, icon: LogIn, accent: 'blue' },
  ];

  const paymentCards: Card[] = [...courses]
    .sort((a, b) => {
      // Slugs in PAYMENT_SLUG_ORDER come first in that exact order;
      // unlisted slugs slot in after, ordered as the server query
      // returned them (price desc).
      const ai = PAYMENT_SLUG_ORDER.indexOf(a.slug);
      const bi = PAYMENT_SLUG_ORDER.indexOf(b.slug);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .map((c) => ({
      id: c.id,
      title: c.title,
      url: `${universityOrigin}/pay/${c.slug}`,
      icon: CreditCard,
      accent: 'emerald' as AccentKey,
      badge: c.price ? formatUsd(c.price) : undefined,
    }));

  const counts = { funnels: FUNNEL_URLS.length, university: universityCards.length, payments: paymentCards.length };
  const cards = tab === 'funnels' ? FUNNEL_URLS : tab === 'university' ? universityCards : paymentCards;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 bg-maxxed-blue rounded-xl flex items-center justify-center shadow-sm">
          <ZapIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Quick Links</h1>
          <p className="text-sm text-gray-600 mt-1">
            Pre-built links and QR codes for funnels, the university, and per-course payment pages. Built for handing out at events.
          </p>
        </div>
      </div>

      {/* Polished segmented switcher */}
      <Switcher tab={tab} setTab={setTab} counts={counts} />

      {/* Empty-state for payments tab when no published paid courses */}
      {tab === 'payments' && paymentCards.length === 0 ? (
        <EmptyPayments />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <QuickCard key={c.id} card={c} onEnlarge={() => setEnlargedCard(c)} />
          ))}
        </div>
      )}

      {/* QR Enlarge sheet (mobile-friendly modal) */}
      {enlargedCard && <EnlargeSheet card={enlargedCard} onClose={() => setEnlargedCard(null)} />}
    </div>
  );
}

// ─── Switcher ─────────────────────────────────────────────────────────
function Switcher({ tab, setTab, counts }: { tab: Tab; setTab: (t: Tab) => void; counts: Record<Tab, number> }) {
  return (
    <div className="sticky top-2 z-20">
      <div className="bg-white/90 backdrop-blur-xl ring-1 ring-gray-200/80 rounded-2xl shadow-sm p-1.5">
        <div className="grid grid-cols-3 gap-1">
          <SwitcherBtn active={tab === 'funnels'} onClick={() => setTab('funnels')} icon={Sparkles} label="Funnels" count={counts.funnels} />
          <SwitcherBtn active={tab === 'university'} onClick={() => setTab('university')} icon={GraduationCap} label="University" count={counts.university} />
          <SwitcherBtn active={tab === 'payments'} onClick={() => setTab('payments')} icon={CreditCard} label="Payments" count={counts.payments} />
        </div>
      </div>
    </div>
  );
}

function SwitcherBtn({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 focus-visible:ring-offset-2 ${
        active
          ? 'bg-maxxed-blue text-white shadow-md'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
      <span className="leading-none truncate">{label}</span>
      <span
        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded transition-colors duration-200 ${
          active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Card (V3 — Hero with action bar) ─────────────────────────────────
function QuickCard({ card, onEnlarge }: { card: Card; onEnlarge: () => void }) {
  const [copied, setCopied] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(card.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: open the URL in a tooltip-friendly manner. Worst case
      // they long-press the URL line below the title to copy manually.
    }
  };

  const handleShare = async () => {
    if (!shareSupported) {
      // Desktop/no-share fallback — same as Copy.
      handleCopy();
      return;
    }
    try {
      await navigator.share({ title: card.title, url: card.url });
    } catch {
      // User cancelled the share sheet — no-op.
    }
  };

  const Icon = card.icon;
  return (
    <div className="bg-white border border-gray-200 hover:border-maxxed-blue/40 hover:shadow-md transition-all rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4">
        <button
          type="button"
          onClick={onEnlarge}
          className="block w-full bg-white rounded-xl p-3 ring-1 ring-gray-200 aspect-square flex items-center justify-center mb-4 hover:ring-maxxed-blue/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
          aria-label={`Enlarge QR for ${card.title}`}
        >
          <QRCodeSVG
            value={card.url}
            level="M"
            marginSize={0}
            className="w-full h-full"
            // Using viewBox-driven sizing — qrcode.react renders SVG at any
            // size without losing fidelity. The QR encodes the literal URL,
            // so it never expires (no third-party shortener).
          />
        </button>

        <div className="flex items-start gap-2.5">
          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${accentBg(card.accent)} ring-1 ${accentRing(card.accent)}`}>
            <Icon className={`w-4 h-4 ${accentText(card.accent)}`} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] font-bold text-gray-900 leading-tight">{card.title}</p>
              {card.badge && (
                <span className="shrink-0 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-200 mt-0.5">
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5 truncate font-mono select-all">{stripProtocol(card.url)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 mt-auto space-y-2">
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 text-[14px] font-semibold rounded-lg px-3 py-2.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 focus-visible:ring-offset-2 ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-maxxed-blue hover:bg-blue-700 text-white'
          }`}
        >
          {copied ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 ring-1 ring-gray-200 rounded-lg px-3 py-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 ring-1 ring-gray-200 rounded-lg px-3 py-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── QR Enlarge sheet ─────────────────────────────────────────────────
function EnlargeSheet({ card, onClose }: { card: Card; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleDownload = () => {
    // Convert the rendered SVG to a downloadable PNG so admins can save
    // the QR for slide decks, printables, etc. Done client-side via
    // canvas — no server round-trip.
    const svg = dialogRef.current?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 1024; // crisp print quality
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `${card.id}-qr.png`;
        link.click();
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = url;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-enlarge-title"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 id="qr-enlarge-title" className="text-lg font-bold text-gray-900 pr-8 leading-tight">{card.title}</h2>
        <p className="text-[12px] text-gray-500 mt-1 font-mono break-all select-all">{stripProtocol(card.url)}</p>
        <div className="bg-white rounded-xl p-4 sm:p-6 ring-1 ring-gray-200 my-4 flex items-center justify-center">
          <QRCodeSVG value={card.url} level="M" marginSize={0} className="w-full h-auto max-w-[320px]" />
        </div>
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 text-[14px] font-semibold text-white bg-maxxed-blue hover:bg-blue-700 rounded-lg px-3 py-2.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 focus-visible:ring-offset-2"
        >
          <Download className="w-4 h-4" /> Download PNG (1024×1024)
        </button>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────
function EmptyPayments() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-12 text-center">
      <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
        <CreditCard className="w-6 h-6 text-emerald-600" />
      </div>
      <p className="text-sm font-semibold text-gray-900">No payment links yet</p>
      <p className="text-[13px] text-gray-500 mt-1 max-w-xs mx-auto">
        Publish a paid course (with a price &gt; 0) and turn off Apply mode to see its permanent payment link here.
      </p>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────
function stripProtocol(url: string) {
  return url.replace(/^https?:\/\//, '');
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function accentBg(a: AccentKey) {
  return {
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
    emerald: 'bg-emerald-50',
    violet: 'bg-violet-50',
    gray: 'bg-gray-50',
  }[a];
}
function accentText(a: AccentKey) {
  return {
    blue: 'text-maxxed-blue',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    violet: 'text-violet-600',
    gray: 'text-gray-600',
  }[a];
}
function accentRing(a: AccentKey) {
  return {
    blue: 'ring-blue-100',
    amber: 'ring-amber-100',
    emerald: 'ring-emerald-100',
    violet: 'ring-violet-100',
    gray: 'ring-gray-100',
  }[a];
}
