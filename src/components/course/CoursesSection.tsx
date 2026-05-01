import { prisma } from '@/lib/prisma';
import { CourseCard } from './CourseCard';
import { Clock } from 'lucide-react';
import { getSectionIcon } from '@/lib/section-icons';
import { auth } from '@/lib/auth';
import { getEffectiveEnrollments, getEnrolledBundleIds } from '@/lib/enrollment';

// Homepage course catalog. Sections + assignments come from the
// `HomepageSection` table — admin-curated via /admin/homepage. Coming Soon
// is the one exception: any course with `comingSoon=true` is auto-collected
// into a hardcoded section at the top, regardless of section assignment.
//
// For logged-in viewers we apply the same enrollment-aware treatment as
// /courses: bundle children are hidden when the parent is owned, and
// directly-enrolled courses get the "Enrolled" badge.
export async function CoursesSection() {
  const session = await auth();
  const [sections, comingSoonCourses, enrolledCourseIds, enrolledBundleIds] = await Promise.all([
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
    session?.user?.id ? getEffectiveEnrollments(session.user.id) : Promise.resolve(new Set<string>()),
    session?.user?.id ? getEnrolledBundleIds(session.user.id) : Promise.resolve(new Set<string>()),
  ]);

  // Filter & flag each section's courses:
  //  · drop coming-soon dupes (they get their own hardcoded section)
  //  · hide bundle children when the viewer owns the parent bundle
  //  · attach `isEnrolled` for direct-enrollment badging
  const populatedSections = sections
    .map((s) => ({
      ...s,
      courses: s.courses
        .filter((c) => !c.comingSoon)
        .filter((c) => !c.bundleId || !enrolledBundleIds.has(c.bundleId))
        .map((c) => ({ ...c, isEnrolled: enrolledCourseIds.has(c.id) })),
    }))
    .filter((s) => s.courses.length > 0);

  const isEmpty = populatedSections.length === 0 && comingSoonCourses.length === 0;

  return (
    <section className="py-16 px-5 md:px-10 max-w-[1300px] mx-auto">
      {/* Coming Soon — always at top, hardcoded special section */}
      {comingSoonCourses.length > 0 && (
        <SectionShell
          title="Coming Soon"
          description="New courses in development"
          icon={<Clock className="w-6 h-6 text-purple-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-75">
            {comingSoonCourses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                slug={course.slug}
                thumbnail={course.thumbnail || undefined}
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
            icon={<Icon className={`w-6 h-6 ${section.iconColor || 'text-[#0000CC]'}`} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">No courses available yet. Check back soon!</p>
        </div>
      )}
    </section>
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
    <div className="mb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-dark mb-1 flex items-center gap-3">
          {icon}
          {title}
        </h2>
        {description && <p className="text-text-body ml-9">{description}</p>}
      </div>
      {children}
    </div>
  );
}
