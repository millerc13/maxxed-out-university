'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Phone,
  Mail,
  MessageSquare,
  ChevronDown,
  ExternalLink,
  Search,
  X,
  Inbox,
  type LucideIcon,
} from 'lucide-react';

export interface LeadRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  source: string;
  status: string;
  ghlContactId: string | null;
  createdAt: string; // ISO
  payload: Record<string, unknown>;
}

export interface CourseTab {
  courseId: string;
  title: string;
  slug: string;
  count: number;
}

const SOURCE_LABELS: Record<string, string> = {
  university: 'University',
  blueprint: 'Blueprint funnel',
  mentorship: 'Mentorship funnel',
  donewithyou: 'Done With You',
  'business-mentorship': 'BAM funnel',
  accelerator: 'Accelerator funnel',
  unknown: 'Unknown',
};

const STATUS_PILL: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
  contacted: 'bg-amber-50 text-amber-700 ring-amber-200',
  enrolled: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  declined: 'bg-gray-100 text-gray-600 ring-gray-200',
};

export function LeadsClient({ leads, courseTabs }: { leads: LeadRow[]; courseTabs: CourseTab[] }) {
  const [tab, setTab] = useState<string>('all'); // 'all' or courseId
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let out = leads;
    if (tab !== 'all') out = out.filter((l) => l.courseId === tab);
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((l) =>
        (l.name ?? '').toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone ?? '').toLowerCase().includes(q)
      );
    }
    return out;
  }, [leads, tab, query]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 bg-maxxed-blue rounded-xl flex items-center justify-center shadow-sm">
          <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Leads</h1>
          <p className="text-sm text-gray-600 mt-1">
            Every application captured from a funnel or the on-platform apply form. Tap a row for the full submission.
          </p>
        </div>
      </div>

      {/* Sticky tab + search */}
      <div className="sticky top-2 z-20 space-y-2">
        <Switcher tab={tab} setTab={setTab} courseTabs={courseTabs} totalCount={leads.length} />
        <div className="bg-white/90 backdrop-blur-xl ring-1 ring-gray-200/80 rounded-xl shadow-sm flex items-center gap-2 px-3 h-11">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, or phone…"
            className="flex-1 min-w-0 bg-transparent outline-none text-base sm:text-sm placeholder:text-gray-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="shrink-0 p-1 -mr-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-12 text-center">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
            <Inbox className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {leads.length === 0 ? 'No leads yet' : 'No matching leads'}
          </p>
          <p className="text-[13px] text-gray-500 mt-1 max-w-xs mx-auto">
            {leads.length === 0
              ? 'New apply submissions will appear here as they come in.'
              : 'Try a different search term or switch tabs.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              expanded={expandedId === lead.id}
              onToggle={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab Switcher ─────────────────────────────────────────────────────
function Switcher({
  tab,
  setTab,
  courseTabs,
  totalCount,
}: {
  tab: string;
  setTab: (t: string) => void;
  courseTabs: CourseTab[];
  totalCount: number;
}) {
  return (
    <div className="bg-white/90 backdrop-blur-xl ring-1 ring-gray-200/80 rounded-2xl shadow-sm p-1.5 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        <TabBtn active={tab === 'all'} onClick={() => setTab('all')} label="All" count={totalCount} />
        {courseTabs.map((c) => (
          <TabBtn
            key={c.courseId}
            active={tab === c.courseId}
            onClick={() => setTab(c.courseId)}
            label={shortenCourseTitle(c.title)}
            count={c.count}
          />
        ))}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 focus-visible:ring-offset-2 ${
        active
          ? 'bg-maxxed-blue text-white shadow-md'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <span className="leading-none whitespace-nowrap">{label}</span>
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

// ─── Lead Card ────────────────────────────────────────────────────────
function LeadCard({
  lead,
  expanded,
  onToggle,
}: {
  lead: LeadRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const initials = (lead.name || lead.email).slice(0, 2).toUpperCase();
  const sourceLabel = SOURCE_LABELS[lead.source] || lead.source;
  const statusCls = STATUS_PILL[lead.status] || STATUS_PILL.submitted;
  const phoneE164 = normalizePhone(lead.phone);

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${expanded ? 'border-maxxed-blue/40 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 focus-visible:ring-inset"
      >
        <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 ring-1 ring-blue-200/60 flex items-center justify-center text-[12px] font-bold text-maxxed-blue">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-bold text-gray-900 leading-tight truncate">{lead.name || lead.email}</p>
            <span className={`shrink-0 inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ${statusCls}`}>
              {lead.status}
            </span>
          </div>
          <p className="text-[12px] text-gray-500 mt-0.5 truncate">
            {lead.courseTitle}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
            <span className="font-mono truncate">{lead.email}</span>
            {phoneE164 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="font-mono truncate">{formatPhoneDisplay(phoneE164)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[10px]">
            <span className="text-gray-400">{relativeTime(lead.createdAt)}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500 font-semibold">{sourceLabel}</span>
          </div>
        </div>
        <ChevronDown
          className={`shrink-0 w-4 h-4 text-gray-400 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3 space-y-3">
          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <ActionBtn href={`tel:${phoneE164 || ''}`} disabled={!phoneE164} icon={Phone} label="Call" />
            <ActionBtn href={`sms:${phoneE164 || ''}`} disabled={!phoneE164} icon={MessageSquare} label="Text" />
            <ActionBtn href={`mailto:${lead.email}`} icon={Mail} label="Email" />
          </div>
          <PayloadDetails payload={lead.payload} />
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-mono">id: {lead.id.slice(0, 12)}…</p>
            {lead.ghlContactId && (
              <Link
                href={`/admin/messages?contactId=${lead.ghlContactId}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-maxxed-blue hover:underline"
              >
                Open in GHL <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  href,
  disabled,
  icon: Icon,
  label,
}: {
  href: string;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
}) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center justify-center gap-1.5 h-11 px-3 text-[13px] font-semibold text-gray-400 bg-white ring-1 ring-gray-200 rounded-lg cursor-not-allowed"
      >
        <Icon className="w-4 h-4" /> {label}
      </button>
    );
  }
  return (
    <a
      href={href}
      className="flex items-center justify-center gap-1.5 h-11 px-3 text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 ring-1 ring-gray-200 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
    >
      <Icon className="w-4 h-4" /> {label}
    </a>
  );
}

function PayloadDetails({ payload }: { payload: Record<string, unknown> }) {
  // Flatten the payload — apply schema mostly stores flat scalar/array
  // values like revenue, teamSize, industry, bottleneck, vision,
  // commitment, bestTimes, heardAbout. Anything we don't recognize
  // shows up under "Other" so nothing's hidden.
  const known = ['revenue', 'teamSize', 'industry', 'bottleneck', 'vision', 'commitment', 'bestTimes', 'heardAbout', 'businessName', 'website'];
  const labelMap: Record<string, string> = {
    revenue: 'Income',
    teamSize: 'Team size',
    industry: 'Focus',
    bottleneck: 'Biggest bottleneck',
    vision: '12-month vision',
    commitment: 'Timeline',
    bestTimes: 'Preferred call times',
    heardAbout: 'Heard about us',
    businessName: 'Business',
    website: 'Website',
  };
  const fields = known
    .filter((k) => payload[k] != null && payload[k] !== '')
    .map((k) => ({ key: k, label: labelMap[k] ?? k, value: formatPayloadValue(payload[k]) }));
  const otherKeys = Object.keys(payload).filter((k) => !known.includes(k) && k !== 'partial' && k !== 'program' && k !== 'name' && k !== 'email' && k !== 'phone' && k !== 'courseId' && k !== 'courseSlug');
  if (fields.length === 0 && otherKeys.length === 0) {
    return (
      <p className="text-[12px] text-gray-400 italic">No additional details captured.</p>
    );
  }
  return (
    <dl className="space-y-1.5">
      {fields.map((f) => (
        <div key={f.key} className="grid grid-cols-3 gap-2 text-[12px]">
          <dt className="col-span-1 font-bold uppercase tracking-wider text-[10px] text-gray-500 pt-0.5">{f.label}</dt>
          <dd className="col-span-2 text-gray-800">{f.value}</dd>
        </div>
      ))}
      {otherKeys.map((k) => (
        <div key={k} className="grid grid-cols-3 gap-2 text-[12px]">
          <dt className="col-span-1 font-bold uppercase tracking-wider text-[10px] text-gray-500 pt-0.5 font-mono">{k}</dt>
          <dd className="col-span-2 text-gray-700">{formatPayloadValue(payload[k])}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────
function shortenCourseTitle(t: string): string {
  // Tab labels need to fit horizontally — strip noise prefixes.
  return t
    .replace(/^Maxxed Out\s*[—-]\s*/i, '')
    .replace(/^Real Estate\s+/, 'RE ')
    .replace(/with Todd$/i, '')
    .trim();
}

function normalizePhone(input: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) {
    const d = trimmed.slice(1).replace(/\D/g, '');
    return d ? `+${d}` : '';
  }
  const d = trimmed.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return trimmed;
}

function formatPhoneDisplay(e164: string): string {
  // +19375551234 → (937) 555-1234. Anything non-NANP, leave verbatim.
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  return e164;
}

function formatPayloadValue(v: unknown): string {
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (v == null) return '—';
  return String(v);
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
