import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { BookOpen, Clock } from 'lucide-react';
import { CourseCard } from '@/components/course/CourseCard';
import { getEffectiveEnrollments, getEnrolledBundleIds } from '@/lib/enrollment';
import { getSectionIcon } from '@/lib/section-icons';

// /courses is a "browse / shop" page. It mirrors the homepage's section
// layout (admin-curated via /admin/homepage) and additionally filters out
// anything the user already owns — they don't need to see Buy Now CTAs for
// courses they paid for. Their owned courses live on /dashboard.
export default async function CoursesPage() {
  const session = await auth();
  const cookieStore = await cookies();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isCustomerView = isAdmin && cookieStore.get('admin_customer_view')?.value === 'true';

  const [sections, comingSoonCourses] = await Promise.all([
    prisma.homepageSection.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      include: {
        courses: {
          where: { OR: [{ published: true }, { comingSoon: true }] },
          include: { modules: { include: { lessons: true } } },
          orderBy: { homepageOrder: 'asc' },
        },
      },
    }),
    prisma.course.findMany({
      where: { comingSoon: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
      },
    }),
  ]);

  // /courses shows the full catalog. Enrolled courses get an "Enrolled"
  // badge + "Continue" CTA. Exception: bundle CHILDREN are hidden when the
  // user owns the parent bundle — they're already represented by the
  // bundle's own card and listing all 11 children would just be noise.
  const enrolledCourseIds =
    session?.user?.id && !isCustomerView
      ? await getEffectiveEnrollments(session.user.id)
      : new Set<string>();
  const enrolledBundleIds =
    session?.user?.id && !isCustomerView
      ? await getEnrolledBundleIds(session.user.id)
      : new Set<string>();

  const populatedSections = sections
    .map((s) => ({
      ...s,
      courses: s.courses
        .filter((c) => !c.comingSoon)
        // Hide children of a bundle the user owns
        .filter((c) => !c.bundleId || !enrolledBundleIds.has(c.bundleId))
        .map((c) => ({
          ...c,
          isEnrolled: enrolledCourseIds.has(c.id),
        })),
    }))
    .filter((s) => s.courses.length > 0);

  const isEmpty = populatedSections.length === 0 && comingSoonCourses.length === 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5f5f7]">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-14 space-y-12">
          {comingSoonCourses.length > 0 && (
            <SectionShell
              title="Coming Soon"
              description="In Development"
              icon={<Clock className="w-5 h-5 text-[#0000CC]" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
                {comingSoonCourses.map((c) => (
                  <CourseCard
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    slug={c.slug}
                    thumbnail={c.thumbnail || undefined}
                    badge="COMING SOON"
                    learningPoints={[]}
                    price={null}
                    comingSoon
                  />
                ))}
              </div>
            </SectionShell>
          )}

          {populatedSections.map((section) => {
            const Icon = getSectionIcon(section.iconName);
            return (
              <SectionShell
                key={section.id}
                title={section.title}
                description={section.description ?? ''}
                icon={<Icon className={`w-5 h-5 ${section.iconColor || 'text-[#0000CC]'}`} />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {section.courses.map((course) => (
                    <CourseCard
                      key={course.id}
                      id={course.id}
                      title={course.title}
                      slug={course.slug}
                      thumbnail={course.thumbnail || undefined}
                      badge="COURSE"
                      learningPoints={[]}
                      price={course.price}
                      externalUrl={course.externalUrl ?? undefined}
                      applyMode={(course as { applyMode?: boolean }).applyMode ?? false}
                      shortDesc={course.shortDesc}
                      enrolled={course.isEnrolled}
                    />
                  ))}
                </div>
              </SectionShell>
            );
          })}

          {isEmpty && (
            <div className="text-center py-24">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-700 mb-2">No courses available</h2>
              <p className="text-gray-400">Check back soon for new content!</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function SectionShell({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">{title}</h2>
        </div>
        <div className="flex-1 h-px bg-[#0000CC]/15" />
        {description && (
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#0000CC]/50">
            {description}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
