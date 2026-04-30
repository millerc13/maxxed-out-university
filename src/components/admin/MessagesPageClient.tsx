'use client';

import { useState } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { ConversationViewer } from '@/components/admin/ConversationViewer';

/** Standalone admin search shell — paste an email or GHL contactId, see the thread. */
export function MessagesPageClient() {
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<{
    contactId?: string;
    email?: string;
  } | null>(null);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value) {
      setSubmittedQuery(null);
      return;
    }
    // GHL contact IDs are typically 24-char ULIDs; treat anything with an
    // "@" as an email and the rest as a contactId.
    if (value.includes('@')) {
      setSubmittedQuery({ email: value });
    } else {
      setSubmittedQuery({ contactId: value });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-maxxed-blue" />
          Messages
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Look up a buyer&rsquo;s GHL conversation thread to confirm welcome / login
          messages were delivered.
        </p>
      </div>

      <form
        onSubmit={onSearch}
        className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-lg p-3"
      >
        <div className="flex-1 min-w-[240px] flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by email or GHL contact ID…"
            className="flex-1 outline-none text-sm"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-semibold hover:bg-maxxed-blue-dark"
        >
          Search
        </button>
      </form>

      {!submittedQuery ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Enter a buyer&rsquo;s email (or GHL contact ID if you already have it) and hit
            Search.
          </p>
        </div>
      ) : (
        <ConversationViewer
          contactId={submittedQuery.contactId}
          email={submittedQuery.email}
        />
      )}
    </div>
  );
}
