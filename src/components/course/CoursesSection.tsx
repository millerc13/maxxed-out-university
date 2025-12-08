import { prisma } from '@/lib/prisma';
import { CourseCard } from './CourseCard';
import { Clock } from 'lucide-react';

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
    orderBy: { order: 'asc' },
  });

  // Separate active courses (with lessons) from coming soon courses (no lessons)
  const activeCourses = courses.filter(
    (course) => course.modules.reduce((acc, m) => acc + m.lessons.length, 0) > 0
  );
  const comingSoonCourses = courses.filter(
    (course) => course.modules.reduce((acc, m) => acc + m.lessons.length, 0) === 0
  );

  return (
    <section className="py-16 px-5 md:px-10 max-w-[1300px] mx-auto">
      {/* Active Courses */}
      {activeCourses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {activeCourses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              slug={course.slug}
              thumbnail={course.thumbnail || undefined}
              badge="COURSE"
              learningPoints={[]}
            />
          ))}
        </div>
      )}

      {/* Coming Soon Section */}
      {comingSoonCourses.length > 0 && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-dark mb-2 flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-500" />
              Coming Soon
            </h2>
            <p className="text-text-body">
              These courses are currently in development. Stay tuned!
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {comingSoonCourses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                slug={course.slug}
                thumbnail={course.thumbnail || undefined}
                badge="COMING SOON"
                learningPoints={[]}
                comingSoon={true}
              />
            ))}
          </div>
        </>
      )}

      {courses.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">No courses available yet. Check back soon!</p>
        </div>
      )}
    </section>
  );
}
