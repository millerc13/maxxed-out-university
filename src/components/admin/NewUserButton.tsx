'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, X, Loader2 } from 'lucide-react';

const ROLES = [
  { value: 'STUDENT', label: 'Student', hint: 'Course access only — no admin' },
  { value: 'ADMIN', label: 'Admin', hint: 'Full access to everything' },
  { value: 'INSTRUCTOR', label: 'Instructor', hint: 'Courses, content & webinars' },
  { value: 'MARKETING', label: 'Marketing', hint: 'Analytics, pixels & webinars' },
  { value: 'SALES', label: 'Sales', hint: 'Leads, deals & analytics' },
  { value: 'SUPPORT', label: 'Support', hint: 'Leads & analytics (read side)' },
];

export function NewUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [password, setPassword] = useState('');
  const [sendInvite, setSendInvite] = useState(true);

  const reset = () => {
    setName(''); setEmail(''); setPhone(''); setRole('STUDENT');
    setPassword(''); setSendInvite(true); setError(null); setSuccess(null);
  };

  const close = () => {
    if (saving) return;
    setOpen(false);
    reset();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, role, password: password || undefined, sendInvite }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create user');
        return;
      }
      setSuccess(
        `${data.user.email} created as ${data.user.role}${
          sendInvite ? (data.inviteSent ? ' — invite email sent' : ' — invite email FAILED (resend from their detail page)') : ''
        }`
      );
      router.refresh();
      // Keep the modal open briefly so the confirmation is readable.
      setTimeout(() => { setOpen(false); reset(); }, 1800);
    } catch {
      setError('Network error — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white hover:bg-maxxed-blue-dark transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        New User
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Create New User</h2>
              <button onClick={close} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">{success}</div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maxxed-blue focus:outline-none"
                    placeholder="person@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maxxed-blue focus:outline-none"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maxxed-blue focus:outline-none"
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Role *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map((r) => (
                      <button
                        type="button"
                        key={r.value}
                        onClick={() => setRole(r.value)}
                        className={`rounded-lg border p-2.5 text-left transition-colors ${
                          role === r.value
                            ? 'border-maxxed-blue bg-blue-50 ring-1 ring-maxxed-blue'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                        <p className="text-[11px] leading-tight text-gray-500">{r.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Temporary password <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maxxed-blue focus:outline-none"
                    placeholder="Min 8 chars — they'll change it on first login"
                  />
                </div>

                <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-gray-300">
                  <input
                    type="checkbox"
                    checked={sendInvite}
                    onChange={(e) => setSendInvite(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">Email them a login link</span>
                    <span className="block text-xs text-gray-500">
                      Sends a &ldquo;your account is ready&rdquo; email with a one-click activation link
                    </span>
                  </span>
                </label>

                {error ? (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
                ) : null}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white hover:bg-maxxed-blue-dark disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Create user
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
