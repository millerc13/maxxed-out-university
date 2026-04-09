'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, MousePointerClick, ShoppingCart, UserCheck, CreditCard, GraduationCap, AlertTriangle, ArrowDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step { name: string; event: string; count: number }
interface ConversionsData { steps: Step[]; errors: { error: string; count: number }[] }

const STEP_ICONS: Record<string, LucideIcon> = {
  '$pageview': Eye,
  'cta_clicked': MousePointerClick,
  'checkout_started': ShoppingCart,
  'contact_info_submitted': UserCheck,
  'payment_initiated': CreditCard,
  'enrollment_completed': GraduationCap,
};

const STEP_COLORS = ['#1E40AF', '#3B82F6', '#6366F1', '#8B5CF6', '#D97706', '#059669'];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E9EEF6] rounded ${className}`} />;
}

export function ConversionsTab({ funnelId }: { funnelId: string }) {
  const [data, setData] = useState<ConversionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/funnels/${funnelId}/analytics/conversions`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [funnelId]);

  if (loading) {
    return (
      <Card className="border-[#DBEAFE]">
        <CardContent className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!data) return <div className="text-gray-400 text-sm py-12 text-center">Failed to load data</div>;

  const { steps, errors } = data;
  const maxCount = steps[0]?.count || 1;

  return (
    <div className="space-y-6">
      <Card className="border-[#DBEAFE]">
        <CardContent className="p-6">
          <h2 className="font-bold text-[#1E3A8A] mb-2 text-sm">Conversion Funnel</h2>
          <p className="text-xs text-gray-400 mb-8">Last 30 days · Drop-off between each step</p>

          <div className="space-y-2">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[step.event] ?? Eye;
              const color = STEP_COLORS[i] ?? '#1E40AF';
              const pct = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
              const prevCount = i > 0 ? steps[i - 1].count : step.count;
              const dropoff = prevCount > 0 && i > 0
                ? ((prevCount - step.count) / prevCount * 100)
                : null;
              const overallPct = maxCount > 0 ? (step.count / maxCount * 100) : 0;

              return (
                <div key={step.event}>
                  {/* Drop-off indicator between steps */}
                  {dropoff !== null && dropoff > 0 && (
                    <div className="flex items-center justify-center gap-1.5 py-1.5">
                      <ArrowDown className="w-3 h-3 text-red-400" />
                      <span className="text-[11px] font-semibold text-red-500 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                        {dropoff.toFixed(1)}% drop
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors duration-150 group">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-[#1E3A8A]">{step.name}</span>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color, fontFamily: "'Fira Code', monospace" }}
                          >
                            {step.count.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400 w-12 text-right tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                            {overallPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#E9EEF6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Errors */}
      {errors.length > 0 && (
        <Card className="border-red-200">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 rounded-t-xl">
              <h2 className="font-bold text-red-700 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Payment Errors
              </h2>
              <p className="text-xs text-red-400 mt-0.5">Issues encountered during checkout</p>
            </div>
            <div className="divide-y divide-gray-100">
              {errors.map((err, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-red-50/30 transition-colors duration-150">
                  <span className="text-sm text-gray-700 truncate pr-4">{err.error}</span>
                  <span className="text-sm font-bold text-red-600 shrink-0 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {err.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
