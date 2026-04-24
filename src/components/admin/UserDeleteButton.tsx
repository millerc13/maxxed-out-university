'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface UserDeleteButtonProps {
  userId: string;
  userLabel: string;
  enrollmentCount: number;
}

export function UserDeleteButton({ userId, userLabel, enrollmentCount }: UserDeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Delete failed');
        setConfirming(false);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 hover:underline text-sm ml-3"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 ml-3">
      <span className="text-xs text-gray-600">
        Delete <strong>{userLabel}</strong>
        {enrollmentCount > 0 && ` + ${enrollmentCount} enrollment${enrollmentCount === 1 ? '' : 's'}`}?
      </span>
      <button
        type="button"
        disabled={loading}
        onClick={onConfirm}
        className="px-2 py-0.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Deleting…' : 'Confirm'}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => setConfirming(false)}
        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
