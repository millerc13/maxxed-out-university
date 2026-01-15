import { prisma } from '@/lib/prisma';
import { CourseCard } from './CourseCard';
import { Star, Sparkles, BookOpen } from 'lucide-react';

// Price tier boundaries in cents
const PRICE_TIERS = {
  LOW: { max: 9700, label: 'Quick Start Guides & Tools', description: 'Bite-sized training to get you moving fast' },
  MID: { min: 9701, max: 150000, label: 'Core Training', description: 'Deep-dive courses to build your skills' },
  HIGH: { min: 150001, label: 'Complete Systems', description: 'Comprehensive programs for serious investors' },
};

export async function CoursesSection() {
  // Fetch all published courses from database
  const courses = await prisma.course.findMany({
    where: { published: true },
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
    orderBy: [{ price: 'desc' }, { order: 'asc' }],
  });

  // Filter out courses with no lessons (coming soon)
  const activeCourses = courses.filter(
    (course) => course.modules.reduce((acc, m) => acc + m.lessons.length, 0) > 0
  );

  // Group by price tier
  const highTicket = activeCourses.filter((c) => c.price && c.price > PRICE_TIERS.MID.max);
  const midTicket = activeCourses.filter((c) => c.price && c.price > PRICE_TIERS.LOW.max && c.price <= PRICE_TIERS.MID.max);
  const lowTicket = activeCourses.filter((c) => c.price && c.price <= PRICE_TIERS.LOW.max);

  return (
    <section className="py-16 px-5 md:px-10 max-w-[1300px] mx-auto">
      {/* High Ticket - Complete Systems */}
      {highTicket.length > 0 && (
        <TierSection
          title={PRICE_TIERS.HIGH.label}
          description={PRICE_TIERS.HIGH.description}
          icon={<Star className="w-6 h-6 text-amber-500" />}
          courses={highTicket}
          featured
        />
      )}

      {/* Mid Ticket - Core Training */}
      {midTicket.length > 0 && (
        <TierSection
          title={PRICE_TIERS.MID.label}
          description={PRICE_TIERS.MID.description}
          icon={<Sparkles className="w-6 h-6 text-purple-500" />}
          courses={midTicket}
        />
      )}

      {/* Low Ticket - Quick Start Guides */}
      <TierSection
        title={PRICE_TIERS.LOW.label}
        description={PRICE_TIERS.LOW.description}
        icon={<BookOpen className="w-6 h-6 text-blue-500" />}
        courses={lowTicket}
        emptyMessage="New quick start guides coming soon!"
      />

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
