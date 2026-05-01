'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TemplateRow {
  id: string;
  name: string;
  active: boolean;
  tokenCount: number;
  signatureCount: number;
  updatedAt: string;
}

interface Props {
  initialTemplates: TemplateRow[];
}

export function TemplatesListClient({ initialTemplates }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialTemplates);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function activate(id: string) {
    setBusy(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/documents/templates/${id}/activate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to activate');
      setRows((prev) =>
        prev.map((r) => ({ ...r, active: r.id === id })).sort(sortRows),
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to activate');
    } finally {
      setBusy(null);
    }
  }

  async function duplicate(id: string) {
    setBusy(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/documents/templates/${id}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate');
      router.push(`/admin/documents/templates/${data.template.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to duplicate');
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    setBusy(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/documents/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setRows((prev) => prev.filter((r) => r.id !== id));
      startTransition(() => router.refresh());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-gray-700 font-semibold mb-1">No templates yet</p>
        <p className="text-sm text-gray-500 mb-4">
          Create your first contract template to start sending documents.
        </p>
        <Link
          href="/admin/documents/templates/new"
          className="inline-flex items-center rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-bold text-white"
        >
          + New template
        </Link>
      </div>
    );
  }

  return (
    <div>
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {/* Desktop: table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-5 py-3">Template</th>
              <th className="px-5 py-3 hidden md:table-cell">Tokens</th>
              <th className="px-5 py-3 hidden md:table-cell">Sent</th>
              <th className="px-5 py-3">Updated</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className={r.active ? 'bg-blue-50/40' : ''}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/documents/templates/${r.id}`}
                      className="font-semibold text-gray-900 hover:text-maxxed-blue truncate"
                    >
                      {r.name}
                    </Link>
                    {r.active && <ActiveBadge />}
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 hidden md:table-cell tabular-nums">
                  {r.tokenCount}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 hidden md:table-cell tabular-nums">
                  {r.signatureCount}
                </td>
                <td className="px-5 py-4 text-sm text-gray-500">
                  {formatDate(r.updatedAt)}
                </td>
                <td className="px-5 py-4 text-right whitespace-nowrap">
                  <RowActions
                    row={r}
                    busy={busy === r.id || pending}
                    onActivate={() => activate(r.id)}
                    onDuplicate={() => duplicate(r.id)}
                    onDelete={() => remove(r.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card stack */}
      <ul className="sm:hidden space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className={
              'rounded-2xl border bg-white p-4 ' +
              (r.active ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200')
            }
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/documents/templates/${r.id}`}
                  className="block font-bold text-gray-900 hover:text-maxxed-blue truncate"
                >
                  {r.name}
                </Link>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{r.tokenCount} tokens</span>
                  <span aria-hidden>·</span>
                  <span>{r.signatureCount} sent</span>
                  <span aria-hidden>·</span>
                  <span>{formatDate(r.updatedAt)}</span>
                </div>
              </div>
              {r.active && <ActiveBadge />}
            </div>
            <RowActions
              row={r}
              busy={busy === r.id || pending}
              onActivate={() => activate(r.id)}
              onDuplicate={() => duplicate(r.id)}
              onDelete={() => remove(r.id)}
              fullWidth
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Active
    </span>
  );
}

function RowActions({
  row,
  busy,
  onActivate,
  onDuplicate,
  onDelete,
  fullWidth = false,
}: {
  row: TemplateRow;
  busy: boolean;
  onActivate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  fullWidth?: boolean;
}) {
  const wrap = fullWidth
    ? 'grid grid-cols-2 gap-2'
    : 'inline-flex items-center gap-2';
  const btn =
    'px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <div className={wrap}>
      <Link
        href={`/admin/documents/templates/${row.id}`}
        className={btn + ' text-gray-700 text-center'}
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={onDuplicate}
        disabled={busy}
        className={btn + ' text-gray-700'}
      >
        Duplicate
      </button>
      {!row.active && (
        <button
          type="button"
          onClick={onActivate}
          disabled={busy}
          className={btn + ' text-maxxed-blue border-maxxed-blue/40 hover:bg-blue-50'}
        >
          Set active
        </button>
      )}
      {!row.active && row.signatureCount === 0 && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className={btn + ' text-red-600 hover:bg-red-50 border-red-200'}
        >
          Delete
        </button>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sortRows(a: TemplateRow, b: TemplateRow) {
  if (a.active !== b.active) return a.active ? -1 : 1;
  return b.updatedAt.localeCompare(a.updatedAt);
}
