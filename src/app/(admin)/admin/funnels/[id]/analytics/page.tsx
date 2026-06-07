import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { FunnelAnalyticsTabs } from '@/components/admin/funnel-analytics/FunnelAnalyticsTabs';
import { auth } from '@/lib/auth';
import { can } from '@/lib/permissions';

export default async function FunnelAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canViewRevenue = can(session?.user?.role, 'revenue:view');

  const funnel = await prisma.funnelDeployment.findUnique({
    where: { id },
    select: { id: true, name: true, subdomain: true, courseId: true, url: true },
  });

  if (!funnel) notFound();

  return (
    <div className="space-y-6" style={{ fontFamily: "'Fira Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/funnels/${funnel.id}`}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-[#DBEAFE] hover:bg-[#E9EEF6] transition-colors duration-150 cursor-pointer"
            aria-label="Back to funnel settings"
          >
            <ArrowLeft className="w-4 h-4 text-[#1E3A8A]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#1E3A8A]" style={{ fontFamily: "'Fira Sans', system-ui, sans-serif" }}>
              {funnel.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              Funnel Analytics
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">Last 30 days</span>
            </p>
          </div>
        </div>
        {funnel.url && (
          <a
            href={funnel.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-[#1E40AF] hover:text-[#3B82F6] transition-colors duration-150 cursor-pointer"
          >
            Visit Funnel
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <FunnelAnalyticsTabs
        funnelId={funnel.id}
        funnelName={funnel.name}
        subdomain={funnel.subdomain}
        courseId={funnel.courseId}
        canViewRevenue={canViewRevenue}
      />
    </div>
  );
}
