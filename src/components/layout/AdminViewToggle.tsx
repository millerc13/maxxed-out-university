'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function AdminViewToggle() {
  const [isCustomerView, setIsCustomerView] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read cookie on mount
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('admin_customer_view='));
    if (cookie) {
      setIsCustomerView(cookie.split('=')[1] === 'true');
    }
  }, []);

  const toggleView = () => {
    const newValue = !isCustomerView;
    setIsCustomerView(newValue);
    // Set cookie
    document.cookie = `admin_customer_view=${newValue}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
    // Refresh the page to apply the new view
    window.location.reload();
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleView}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        isCustomerView
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
      }`}
      title={isCustomerView ? 'Switch to Admin View' : 'Switch to Customer View'}
    >
      {isCustomerView ? (
        <>
          <EyeOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Customer View</span>
        </>
      ) : (
        <>
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Admin View</span>
        </>
      )}
    </button>
  );
}
