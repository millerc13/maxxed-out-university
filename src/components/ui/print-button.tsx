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
      className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-lg transition-colors print:hidden ${className}`}
      title="Print this lesson"
    >
      <Printer className="w-4 h-4" />
      Print Lesson
    </button>
  );
}
