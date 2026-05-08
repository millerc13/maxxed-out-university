'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2 } from 'lucide-react';

interface EnrollUserButtonProps {
  courses: { id: string; title: string }[];
  users: { id: string; email: string; name: string | null }[];
}

type Tab = 'existing' | 'new';

export function EnrollUserButton({ courses, users }: EnrollUserButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<Tab>('existing');

  // Existing-user fields
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  // New-person fields
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCourse, setNewCourse] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const closeModal = () => {
    setShowModal(false);
    setTab('existing');
    setSelectedUser('');
    setSelectedCourse('');
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewCourse('');
    setError('');
    setSuccessMsg('');
  };

  const handleEnrollExisting = async () => {
    if (!selectedUser || !selectedCourse) {
      setError('Please select both a user and a course');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          courseId: selectedCourse,
          source: 'manual',
        }),
      });
      if (response.ok) {
        closeModal();
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to enroll user');
      }
    } catch {
      setError('Failed to enroll user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantNew = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPhone.trim() || !newCourse) {
      setError('Name, email, phone, and course are all required');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await fetch('/api/admin/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim(),
          courseId: newCourse,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const smsBit =
          data.smsStatus === 'sent'
            ? ' Welcome SMS sent.'
            : data.smsStatus === 'skipped-non-prod'
              ? ' (SMS skipped — non-prod env.)'
              : data.smsStatus === 'failed'
                ? ' SMS failed — check logs.'
                : ' SMS skipped — no GHL contact.';
        setSuccessMsg(
          `${data.newUser ? 'Account created' : 'User found'} and enrolled in ${data.courseTitle}.${smsBit}`
        );
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        setNewCourse('');
        router.refresh();
      } else {
        setError(data.error || 'Failed to grant access');
      }
    } catch {
      setError('Failed to grant access');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark transition-colors"
      >
        <Plus className="w-5 h-5" />
        Enroll User
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Enroll User in Course</h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 mb-4 border-b border-gray-200">
              <button
                onClick={() => {
                  setTab('existing');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === 'existing'
                    ? 'border-maxxed-blue text-maxxed-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Existing user
              </button>
              <button
                onClick={() => {
                  setTab('new');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === 'new'
                    ? 'border-maxxed-blue text-maxxed-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                New person
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                {successMsg}
              </div>
            )}

            {tab === 'existing' && (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maxxed-blue focus:border-transparent"
                    >
                      <option value="">Select a user...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name ? `${user.name} (${user.email})` : user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maxxed-blue focus:border-transparent"
                    >
                      <option value="">Select a course...</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEnrollExisting}
                    disabled={isLoading || !selectedUser || !selectedCourse}
                    className="px-4 py-2 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Enroll
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {tab === 'new' && (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  Creates an account, enrolls them, and texts a one-tap login link via GHL.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maxxed-blue focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maxxed-blue focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone (for welcome SMS)
                    </label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+1 555 555 1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maxxed-blue focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select
                      value={newCourse}
                      onChange={(e) => setNewCourse(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maxxed-blue focus:border-transparent"
                    >
                      <option value="">Select a course...</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    disabled={isLoading}
                  >
                    Close
                  </button>
                  <button
                    onClick={handleGrantNew}
                    disabled={
                      isLoading ||
                      !newName.trim() ||
                      !newEmail.trim() ||
                      !newPhone.trim() ||
                      !newCourse
                    }
                    className="px-4 py-2 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Granting...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Grant access &amp; text link
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
