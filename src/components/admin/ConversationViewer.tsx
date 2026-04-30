'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Activity,
  AlertCircle,
} from 'lucide-react';

interface GHLContactDetail {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
}

interface GHLMessage {
  id: string;
  conversationId: string;
  contactId: string;
  body: string;
  type: number;
  direction: 'inbound' | 'outbound';
  status: string;
  dateAdded: string;
  meta?: {
    email?: {
      subject?: string;
    };
  };
}

interface Props {
  /** GHL contact ID — preferred when known. */
  contactId?: string | null;
  /** Email fallback when no contactId is on file. */
  email?: string | null;
  /** Auto-refresh interval in ms. Default 10000. Pass 0 to disable. */
  refreshMs?: number;
  /** Optional empty-state copy override. */
  emptyMessage?: string;
}

/**
 * Read-only GHL conversation viewer for the admin panel. Mirrors the
 * mastermind-stripe-dashboard `<ConversationHistory>` component but
 * stripped of the send-message UI — we only care about visual
 * confirmation that course-login messages went out.
 */
export function ConversationViewer({
  contactId,
  email,
  refreshMs = 10_000,
  emptyMessage = 'No messages yet.',
}: Props) {
  const [contact, setContact] = useState<GHLContactDetail | null>(null);
  const [messages, setMessages] = useState<GHLMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  async function load(initial = false) {
    if (!contactId && !email) {
      setLoading(false);
      return;
    }
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (contactId) params.set('contactId', contactId);
      else if (email) params.set('email', email);
      const res = await fetch(`/api/admin/ghl/conversations?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Request failed (${res.status})`);
        if (initial) {
          setContact(null);
          setMessages([]);
        }
        return;
      }
      setContact(json.contact ?? null);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
      setError(json.error ?? null);
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  }

  useEffect(() => {
    load(true);
    if (!refreshMs) return;
    const id = setInterval(() => load(false), refreshMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, email, refreshMs]);

  // Pin the scroll to the bottom on first render so the latest message
  // is visible without the admin having to scroll.
  useEffect(() => {
    if (loading || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [loading, messages.length]);

  if (!contactId && !email) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold">No GHL contact linked</p>
          <p className="mt-0.5 text-amber-700/80 text-xs">
            This user doesn&apos;t have a GHL contact ID stored and no email is available
            for lookup. Conversation history isn&apos;t fetchable.
          </p>
        </div>
      </div>
    );
  }

  const contactName =
    contact &&
    ([contact.name, contact.firstName, contact.lastName].filter(Boolean)[0] ||
      contact.email ||
      contact.id);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          {contact && (
            <span className="hidden sm:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-maxxed-blue to-maxxed-blue-dark text-white text-sm font-extrabold shadow-sm">
              {(contactName || '?').charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base capitalize">
              {contactName || 'Conversation'}
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-500 truncate flex items-center gap-1.5">
              <span className="tabular-nums">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
              {contact?.email && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="truncate normal-case">{contact.email}</span>
                </>
              )}
              {contact?.phone && (
                <>
                  <span className="hidden sm:inline text-gray-300">·</span>
                  <span className="hidden sm:inline">{contact.phone}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load(false)}
          disabled={refreshing}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
          title="Refresh"
          aria-label="Refresh conversation"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div
        ref={listRef}
        className="max-h-[60vh] md:max-h-[calc(100dvh-22rem)] overflow-y-auto px-4 py-4 space-y-2 bg-gray-50/40"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading conversation…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400 italic">{emptyMessage}</div>
        ) : (
          messages.map((m) => <MessageRow key={m.id} message={m} />)
        )}
      </div>
    </div>
  );
}

// Heuristic for "system event" rows — GHL sometimes returns these as
// `type === 28` (Activity) or with bodies that match the standard
// "Tag added" / "Note added" / "Opportunity created" wording.
const SYSTEM_EVENT_PATTERNS = [
  /^Opportunity (created|updated|moved)/i,
  /^Contact (created|updated)/i,
  /^Tag (added|removed)/i,
  /^Note added/i,
  /^Workflow /i,
];

function isSystemEvent(m: GHLMessage): boolean {
  if (m.type === 28) return true;
  return SYSTEM_EVENT_PATTERNS.some((p) => p.test(m.body || ''));
}

function MessageRow({ message }: { message: GHLMessage }) {
  if (isSystemEvent(message)) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-purple-50 border border-purple-200 text-purple-800 text-[11px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          {message.body || 'Event'}
          <span className="text-purple-500/60 normal-case font-normal ml-1.5">
            · {formatTimestamp(message.dateAdded)}
          </span>
        </div>
      </div>
    );
  }

  const outbound = message.direction === 'outbound';
  const isEmail = message.type === 3 || !!message.meta?.email;
  const channelLabel = isEmail ? 'Email' : 'SMS';
  const ChannelIcon = isEmail ? Mail : MessageSquare;

  return (
    <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] flex flex-col ${outbound ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
              isEmail
                ? outbound
                  ? 'bg-cyan-600 text-white'
                  : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                : outbound
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            <ChannelIcon className="w-3 h-3" />
            {channelLabel}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
            {outbound ? 'Sent' : 'Received'}
          </span>
        </div>

        <div
          className={`rounded-2xl px-3.5 py-2 shadow-sm ${
            outbound
              ? 'bg-maxxed-blue text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
          }`}
        >
          {isEmail && message.meta?.email?.subject && (
            <p
              className={`text-xs font-semibold mb-1 ${
                outbound ? 'text-white/90' : 'text-gray-700'
              }`}
            >
              {message.meta.email.subject}
            </p>
          )}
          <p
            className={`text-sm whitespace-pre-wrap [overflow-wrap:anywhere] ${
              outbound ? '' : 'text-gray-800'
            }`}
          >
            {message.body || (
              <span className="italic opacity-70">(empty body)</span>
            )}
          </p>
        </div>

        <span className="text-[10px] text-gray-400 mt-1">
          {formatTimestamp(message.dateAdded)}
          {message.status && message.status !== 'delivered' && (
            <span className="ml-1.5 text-orange-600 font-semibold">· {message.status}</span>
          )}
        </span>
      </div>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}
