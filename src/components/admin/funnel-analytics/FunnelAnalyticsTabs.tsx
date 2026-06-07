'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart2, GitBranch, MousePointerClick, Video, DollarSign } from 'lucide-react';
import { OverviewTab } from './OverviewTab';
import { ConversionsTab } from './ConversionsTab';
import { EngagementTab } from './EngagementTab';
import { RecordingsTab } from './RecordingsTab';
import { RevenueTab } from './RevenueTab';

interface Props {
  funnelId: string;
  funnelName: string;
  subdomain: string | null;
  courseId: string | null;
  /** Gate the Revenue tab — hidden from staff without revenue:view. */
  canViewRevenue?: boolean;
}

const TABS = [
  { value: 'overview', label: 'Overview', icon: BarChart2 },
  { value: 'conversions', label: 'Conversions', icon: GitBranch },
  { value: 'engagement', label: 'Engagement', icon: MousePointerClick },
  { value: 'recordings', label: 'Recordings', icon: Video },
  { value: 'revenue', label: 'Revenue', icon: DollarSign },
] as const;

export function FunnelAnalyticsTabs({ funnelId, canViewRevenue = false }: Props) {
  // Drop the Revenue tab entirely (trigger + content) when not permitted —
  // RevenueTab fetches /analytics/revenue, which is also blocked server-side.
  const tabs = TABS.filter((t) => t.value !== 'revenue' || canViewRevenue);
  return (
    <div style={{ fontFamily: "'Fira Sans', system-ui, sans-serif" }}>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start bg-[#E9EEF6] rounded-xl p-1.5 h-auto gap-1 overflow-x-auto">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-[#1E40AF] data-[state=active]:shadow-sm text-[#64748B] hover:text-[#1E3A8A] whitespace-nowrap shrink-0"
            >
              <Icon className="w-4 h-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="conversions" className="mt-6">
          <ConversionsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="engagement" className="mt-6">
          <EngagementTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="recordings" className="mt-6">
          <RecordingsTab funnelId={funnelId} />
        </TabsContent>
        {canViewRevenue && (
          <TabsContent value="revenue" className="mt-6">
            <RevenueTab funnelId={funnelId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
