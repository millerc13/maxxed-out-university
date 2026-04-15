'use client';

import { Printer } from 'lucide-react';

interface PrintButtonProps {
  className?: string;
}

export function PrintButton({ className = '' }: PrintButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      aria-label="Print this lesson"
      className={`inline-flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-lg transition-colors cursor-pointer print:hidden flex-shrink-0 ${className}`}
      title="Print this lesson"
    >
      <Printer className="w-4 h-4" />
      <span className="hidden sm:inline">Print</span>
    </button>
  );
}
