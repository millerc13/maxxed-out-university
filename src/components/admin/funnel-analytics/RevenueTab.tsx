'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Receipt, Tag, AlertCircle } from 'lucide-react';

interface RevenueData {
  kpis: {
    totalRevenue: number;
    enrollmentCount: number;
    avgOrderValue: number;
    promoApplied: number;
    promoFailed: number;
    promoFailRate: number;
  };
  promoCodes: { code: string; applied: number; failed: number }[];
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E9EEF6] rounded ${className}`} />;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

export function RevenueTab({ funnelId }: { funnelId: string }) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/funnels/${funnelId}/analytics/revenue`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [funnelId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-gray-400 text-sm py-12 text-center">Failed to load data</div>;

  const { kpis, promoCodes } = data;

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(kpis.totalRevenue), icon: DollarSign, bg: 'bg-emerald-600', sub: `${kpis.enrollmentCount} paid enrollment${kpis.enrollmentCount !== 1 ? 's' : ''}` },
    { label: 'Avg Order Value', value: formatCurrency(kpis.avgOrderValue), icon: Receipt, bg: 'bg-[#1E40AF]', sub: 'per enrollment' },
    { label: 'Promos Used', value: kpis.promoApplied.toString(), icon: Tag, bg: 'bg-[#6366F1]', sub: 'successfully applied' },
    { label: 'Promo Fail Rate', value: `${(kpis.promoFailRate * 100).toFixed(1)}%`, icon: AlertCircle, bg: 'bg-[#DC2626]', sub: `${kpis.promoFailed} failed attempt${kpis.promoFailed !== 1 ? 's' : ''}` },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label} className="border-[#DBEAFE] hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-[#1E3A8A] mt-1.5 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Promo Code Table */}
      {promoCodes.length > 0 && (
        <Card className="border-[#DBEAFE]">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-[#DBEAFE]">
              <h2 className="font-bold text-[#1E3A8A] flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-[#1E40AF]" />
                Promo Code Usage
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
            </div>

            {/* Table header */}
            <div className="px-6 py-2.5 flex items-center text-[10px] font-bold uppercase tracking-widest text-[#64748B] border-b border-[#E9EEF6] bg-[#F8FAFC]">
              <span className="flex-1">Code</span>
              <span className="w-24 text-right">Applied</span>
              <span className="w-24 text-right">Failed</span>
              <span className="w-24 text-right">Success %</span>
            </div>

            <div className="divide-y divide-gray-100">
              {promoCodes.map((promo, i) => {
                const total = promo.applied + promo.failed;
                const successRate = total > 0 ? (promo.applied / total * 100) : 0;
                return (
                  <div key={i} className="px-6 py-3.5 flex items-center hover:bg-[#F8FAFC] transition-colors duration-150">
                    <span className="flex-1 text-sm font-bold text-[#1E3A8A] tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {promo.code}
                    </span>
                    <span className="w-24 text-right text-sm font-semibold text-emerald-600 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {promo.applied}
                    </span>
                    <span className="w-24 text-right text-sm font-semibold text-red-500 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {promo.failed}
                    </span>
                    <span className="w-24 text-right text-sm font-semibold text-[#1E3A8A] tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {successRate.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
