import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getEffectiveEnrollments } from '@/lib/enrollment';
import { Header, Footer } from '@/components/layout';
import { Wrench, ArrowRight, Lock, Calculator, TrendingUp, BarChart3, DollarSign, Building2, PieChart, FileSpreadsheet, Download, ClipboardCheck, FileText, Phone, ListChecks, ScrollText, BookOpen } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  calculator: Calculator,
  'trending-up': TrendingUp,
  'bar-chart': BarChart3,
  'dollar-sign': DollarSign,
  building: Building2,
  'pie-chart': PieChart,
  spreadsheet: FileSpreadsheet,
  wrench: Wrench,
  'clipboard-check': ClipboardCheck,
  'file-text': FileText,
  phone: Phone,
  'list-checks': ListChecks,
  'scroll-text': ScrollText,
  'book-open': BookOpen,
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

/* Reference docs that stay as downloads (not interactive tools) */
const DOWNLOAD_FILES = [
  { name: '12-Month Action Plan', file: '12-month-action-plan.docx' },
  { name: 'Cash Buyer List', file: 'cash-buyer-list.docx' },
  { name: 'Creative Finance Cheat Sheet', file: 'creative-finance-cheat-sheet.docx' },
  { name: 'Fix & Flip Timeline', file: 'fix-flip-timeline.docx' },
  { name: 'Private Money Pitch Deck', file: 'private-money-pitch-deck.docx' },
  { name: 'Real Estate Glossary', file: 'real-estate-glossary.docx' },
  { name: 'Team Contact Sheet', file: 'team-contact-sheet.docx' },
  { name: 'Tenant Screening Criteria', file: 'tenant-screening-criteria.docx' },
];

export default async function ToolsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const isAdmin = session.user.role === 'ADMIN';
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
              Interactive calculators, templates, and analysis tools included with your courses.
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
            <div className="space-y-12">
              {/* Interactive Tools by Course */}
              {groups.map((group) => (
                <div key={group.course.id} className="bg-white rounded-2xl shadow-sm p-8">
                  <SectionHeader
                    icon={<Building2 className="w-6 h-6 text-[#0000CC]" />}
                    title={group.course.title}
                    label={`${group.tools.length} tool${group.tools.length !== 1 ? 's' : ''}`}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              ))}

              {/* Downloads Section */}
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <SectionHeader
                  icon={<Download className="w-6 h-6 text-[#0000CC]" />}
                  title="Reference Downloads"
                  label={`${DOWNLOAD_FILES.length} files`}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DOWNLOAD_FILES.map((dl) => (
                    <a
                      key={dl.file}
                      href={`/downloads/${dl.file}`}
                      download
                      className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-gray-300 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{dl.name}</p>
                        <p className="text-xs text-gray-400">.docx</p>
                      </div>
                      <Download className="w-4 h-4 text-gray-300 group-hover:text-[#0000CC] transition-colors ml-auto shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
