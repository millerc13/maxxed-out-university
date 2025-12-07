'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserRoleSelectProps {
  userId: string;
  currentRole: string;
}

const roles = [
  { value: 'STUDENT', label: 'Student', color: 'bg-gray-100 text-gray-700' },
  { value: 'INSTRUCTOR', label: 'Instructor', color: 'bg-purple-100 text-purple-700' },
  { value: 'ADMIN', label: 'Admin', color: 'bg-red-100 text-red-700' },
];

export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const [role, setRole] = useState(currentRole);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRoleChange = async (newRole: string) => {
    if (newRole === role) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setRole(newRole);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (error) {
      alert('Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoleInfo = roles.find((r) => r.value === role) || roles[0];

  return (
    <select
      value={role}
      onChange={(e) => handleRoleChange(e.target.value)}
      disabled={isLoading}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer ${currentRoleInfo.color} ${isLoading ? 'opacity-50' : ''}`}
    >
      {roles.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
