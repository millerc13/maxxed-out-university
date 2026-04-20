import { prisma } from '@/lib/prisma';
import { CourseCard } from './CourseCard';
import { Star, Sparkles, BookOpen, Zap, Clock, Handshake } from 'lucide-react';

// Price tier boundaries in cents — matches /courses page exactly
const PRICE_TIERS = {
  LOW: { max: 9700, label: 'Quick Start Guides & Tools', description: 'Bite-sized training to get you moving fast' },
  MID: { min: 9701, max: 150000, label: 'Core Training', description: 'Deep-dive courses to build your skills' },
  HIGH: { min: 150001, max: 2500000, label: 'Partnership Programs', description: 'Work with Todd to build your business' },
  ELITE: { min: 2500001, label: 'Elite Access', description: 'Direct mentorship and partnerships' },
};

export async function CoursesSection() {
  const courses = await prisma.course.findMany({
    where: { OR: [{ published: true }, { comingSoon: true }] },
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
    orderBy: [{ price: 'asc' }, { order: 'asc' }],
  });

  const activeCourses = courses.filter(
    (course) => !course.comingSoon && course.modules.reduce((acc, m) => acc + m.lessons.length, 0) > 0
  );
  const comingSoonCourses = courses.filter((course) => course.comingSoon);

  // External partner programs: no lessons required; shown as "Apply Now" tile
  const partnerPrograms = courses.filter((c) => !c.comingSoon && (c as any).externalUrl);

  // Group by price tier — same as /courses page
  const eliteTicket = activeCourses.filter((c) => c.price && c.price > PRICE_TIERS.HIGH.max);
  // Bundle courses (multi-module flagships) get their own "Full Courses" section
  const fullCourses = activeCourses.filter((c) => c.isBundle && c.price);
  // Partnership programs: high-ticket 1-on-1 / DFY (non-bundle), excluding bundles
  const highTicket = activeCourses.filter((c) => !c.isBundle && c.price && c.price > PRICE_TIERS.MID.max && c.price <= PRICE_TIERS.HIGH.max);
  const midTicket = activeCourses.filter((c) => !c.isBundle && c.price && c.price > PRICE_TIERS.LOW.max && c.price <= PRICE_TIERS.MID.max);
  const lowTicket = activeCourses.filter((c) => !c.isBundle && c.price && c.price <= PRICE_TIERS.LOW.max);
  const freeCourses = activeCourses.filter((c) => !c.isBundle && !c.price);

  return (
    <section className="py-16 px-5 md:px-10 max-w-[1300px] mx-auto">
      {/* Coming Soon */}
      {comingSoonCourses.length > 0 && (
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text-dark mb-1 flex items-center gap-3">
              <Clock className="w-6 h-6 text-purple-500" />
              Coming Soon
            </h2>
            <p className="text-text-body ml-9">New courses in development</p>
          </div>
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
        </div>
      )}

      {/* Elite Access */}
      {eliteTicket.length > 0 && (
        <TierSection
          title={PRICE_TIERS.ELITE.label}
          description={PRICE_TIERS.ELITE.description}
          icon={<Zap className="w-6 h-6 text-amber-500" />}
          courses={eliteTicket}
          featured
        />
      )}

      {/* Partnership Programs — high-ticket paid courses + application-only external */}
      {(highTicket.length > 0 || partnerPrograms.length > 0) && (
        <TierSection
          title={PRICE_TIERS.HIGH.label}
          description={PRICE_TIERS.HIGH.description}
          icon={<Handshake className="w-6 h-6 text-[#0000CC]" />}
          courses={[...partnerPrograms, ...highTicket]}
          featured
        />
      )}

      {/* Full Courses — flagship bundle courses (e.g. Real Estate Empire Blueprint) */}
      {fullCourses.length > 0 && (
        <TierSection
          title="Full Courses"
          description="Complete multi-module programs"
          icon={<Star className="w-6 h-6 text-amber-500" />}
          courses={fullCourses}
        />
      )}

      {/* Core Training */}
      {midTicket.length > 0 && (
        <TierSection
          title={PRICE_TIERS.MID.label}
          description={PRICE_TIERS.MID.description}
          icon={<Sparkles className="w-6 h-6 text-purple-500" />}
          courses={midTicket}
        />
      )}

      {/* Quick Start Guides & Tools */}
      <TierSection
        title={PRICE_TIERS.LOW.label}
        description={PRICE_TIERS.LOW.description}
        icon={<BookOpen className="w-6 h-6 text-blue-500" />}
        courses={lowTicket}
        emptyMessage="New quick start guides coming soon!"
      />

      {/* Free Resources */}
      {freeCourses.length > 0 && (
        <TierSection
          title="Free Resources"
          description="Start learning for free"
          icon={<BookOpen className="w-6 h-6 text-green-500" />}
          courses={freeCourses}
        />
      )}

      {courses.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">No courses available yet. Check back soon!</p>
        </div>
      )}
    </section>
  );
}

function TierSection({
  title,
  description,
  icon,
  courses,
  featured,
  emptyMessage,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  courses: any[];
  featured?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className={`mb-12 ${featured ? 'relative' : ''}`}>
      {featured && (
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl -z-10" />
      )}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-dark mb-1 flex items-center gap-3">
          {icon}
          {title}
        </h2>
        <p className="text-text-body ml-9">{description}</p>
      </div>
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
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
              shortDesc={course.shortDesc}
            />
          ))}
        </div>
      ) : emptyMessage ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <p className="text-text-muted">{emptyMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
