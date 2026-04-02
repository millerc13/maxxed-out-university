import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getEffectiveEnrollments } from '@/lib/enrollment';
import { Header, Footer } from '@/components/layout';
import { Wrench, ArrowRight, Lock, Calculator, TrendingUp, BarChart3, DollarSign, Building2, PieChart, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { SavedReportsDock } from '@/components/tools/SavedReportsDock';

const ICON_MAP: Record<string, LucideIcon> = {
  calculator: Calculator,
  'trending-up': TrendingUp,
  'bar-chart': BarChart3,
  'dollar-sign': DollarSign,
  building: Building2,
  'pie-chart': PieChart,
  spreadsheet: FileSpreadsheet,
  wrench: Wrench,
};

function getIcon(name: string | null): LucideIcon {
  return ICON_MAP[name || ''] || Calculator;
}

function SectionHeader({ icon, title, label }: { icon: React.ReactNode; title: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">{title}</h2>
      </div>
      <div className="flex-1 h-px bg-[#0000CC]/15" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#0000CC]/50">{label}</span>
    </div>
  );
}

export default async function ToolsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const isAdmin = (session.user as any).role === 'ADMIN';
  const isCustomerView = isAdmin && cookieStore.get('admin_customer_view')?.value === 'true';
  const showAll = isAdmin && !isCustomerView;

  // Get enrolled course IDs (includes bundle access)
  const enrolledCourseIds = showAll
    ? new Set<string>()
    : await getEffectiveEnrollments(session.user.id!);

  // Fetch tools — admin sees all, users see only enrolled
  const tools = await prisma.tool.findMany({
    where: {
      published: true,
      ...(showAll ? {} : { courseId: { in: Array.from(enrolledCourseIds) } }),
    },
    include: { course: true },
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
  });

  // Also fetch all published tools to show locked ones
  const allTools = showAll
    ? tools
    : await prisma.tool.findMany({
        where: { published: true },
        include: { course: true },
        orderBy: [{ order: 'asc' }, { title: 'asc' }],
      });

  // Fetch saved reports for the dock
  const savedReports = await prisma.savedReport.findMany({
    where: { userId: session.user.id! },
    select: { id: true, name: true, toolSlug: true, results: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });
  const serializedReports = savedReports.map((r) => ({
    id: r.id,
    name: r.name,
    toolSlug: r.toolSlug,
    results: r.results as Record<string, any>,
    updatedAt: r.updatedAt.toISOString(),
  }));
  // Build count map from fetched reports
  const reportCountMap = new Map<string, number>();
  for (const r of savedReports) {
    reportCountMap.set(r.toolSlug, (reportCountMap.get(r.toolSlug) || 0) + 1);
  }
  // Build tool meta for the dock
  const toolMetaList = allTools.map((t) => ({ slug: t.slug, title: t.title, icon: t.icon }));

  const unlockedSlugs = new Set(tools.map((t) => t.slug));

  // Group by course
  const courseGroups = new Map<string, { course: any; tools: typeof allTools }>();
  for (const tool of allTools) {
    const group = courseGroups.get(tool.courseId) || { course: tool.course, tools: [] };
    group.tools.push(tool);
    courseGroups.set(tool.courseId, group);
  }

  const groups = Array.from(courseGroups.values());
  const hasAnyTools = allTools.length > 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5f5f7]">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1300px] mx-auto px-5 md:px-10 py-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#0000CC]/10 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-[#0000CC]" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">Tools</h1>
            </div>
            <p className="text-gray-500 ml-[52px]">
              Interactive calculators and analysis tools included with your courses.
            </p>
          </div>
        </div>

        <div className="max-w-[1300px] mx-auto px-5 md:px-10 py-10">
          {!hasAnyTools ? (
            <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No tools available yet</h2>
              <p className="text-gray-500 mb-6">
                Tools will appear here as they are added to courses.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0000CC] text-white font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-[#0000aa] transition-colors"
              >
                Browse Courses <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : tools.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Unlock tools by enrolling in courses</h2>
              <p className="text-gray-500 mb-6">
                Some courses include interactive calculators and analysis tools. Enroll to get access.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0000CC] text-white font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-[#0000aa] transition-colors"
              >
                Browse Courses <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="flex gap-8 items-start">
              {/* Tools column */}
              <div className="flex-1 min-w-0 space-y-12">
                {groups.map((group) => {
                  return (
                    <div key={group.course.id} className="bg-white rounded-2xl shadow-sm p-8">
                      <SectionHeader
                        icon={<Building2 className="w-6 h-6 text-[#0000CC]" />}
                        title={group.course.title}
                        label={`${group.tools.length} tool${group.tools.length !== 1 ? 's' : ''}`}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {group.tools.map((tool) => {
                          const isUnlocked = unlockedSlugs.has(tool.slug);
                          const Icon = getIcon(tool.icon);
                          return (
                            <div
                              key={tool.id}
                              className={`relative rounded-xl border transition-all ${
                                isUnlocked
                                  ? 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                                  : 'bg-gray-50 border-gray-200 opacity-60'
                              }`}
                            >
                              <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="w-12 h-12 rounded-xl bg-[#0000CC]/10 flex items-center justify-center">
                                    <Icon className="w-6 h-6 text-[#0000CC]" />
                                  </div>
                                  {!isUnlocked && (
                                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                      <Lock className="w-3 h-3" />
                                      Locked
                                    </div>
                                  )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{tool.title}</h3>
                                {tool.description && (
                                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{tool.description}</p>
                                )}
                                {isUnlocked ? (
                                  <Link
                                    href={`/tools/${tool.slug}`}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0000CC] text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#0000aa] transition-colors w-full justify-center"
                                  >
                                    Open Tool <ArrowRight className="w-3.5 h-3.5" />
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/courses/${group.course.slug}`}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-gray-300 transition-colors w-full justify-center"
                                  >
                                    Enroll to Unlock <ArrowRight className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Saved Reports Dock — right side */}
              {serializedReports.length > 0 && (
                <div className="hidden lg:block w-72 shrink-0 sticky top-8">
                  <SavedReportsDock
                    reports={serializedReports}
                    tools={toolMetaList}
                    totalLimit={10}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
