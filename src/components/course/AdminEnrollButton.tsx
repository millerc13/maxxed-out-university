'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';

interface AdminEnrollButtonProps {
  courseId: string;
  courseName: string;
}

export function AdminEnrollButton({ courseId, courseName }: AdminEnrollButtonProps) {
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  const handleEnroll = async () => {
    if (loading || enrolled) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      if (response.ok) {
        setEnrolled(true);
        // Refresh the page to show enrolled state
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to enroll');
      }
    } catch (error) {
      alert('Failed to enroll');
    } finally {
      setLoading(false);
    }
  };

  if (enrolled) {
    return (
      <div className="mt-3 text-center text-sm text-green-600 font-medium">
        Enrolled successfully!
      </div>
    );
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
    >
      <UserPlus className="w-4 h-4" />
      {loading ? 'Enrolling...' : 'Admin: Enroll Free'}
    </button>
  );
}
