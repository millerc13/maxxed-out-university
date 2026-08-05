import type { ReactNode } from 'react';

/** Compact table for recent-items feeds inside widgets. */
export function DataTable({
  headers,
  rows,
  align = [],
}: {
  headers: string[];
  rows: ReactNode[][];
  /** 'r' right-aligns that column index. */
  align?: Array<'l' | 'r'>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#EEF0F3] text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            {headers.map((h, i) => (
              <th key={h} className={`py-1.5 pr-2 font-semibold ${align[i] === 'r' ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b border-[#F6F7F9] last:border-0">
              {cells.map((cell, c) => (
                <td
                  key={c}
                  className={`py-1.5 pr-2 text-[#4B5563] ${align[c] === 'r' ? 'text-right tabular-nums' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-3 text-center text-[#9CA3AF]">
                No data yet
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
