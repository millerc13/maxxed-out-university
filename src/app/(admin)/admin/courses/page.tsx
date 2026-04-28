import { prisma } from '@/lib/prisma';
import { CourseSectionsBoard } from '@/components/admin/CourseSectionsBoard';

// Unified admin courses + homepage sections page. Replaces the old plain
// course list. Admins drag courses between sections to control their
// placement on /, /courses, and /dashboard. The same row exposes Edit /
// View / Delete actions.
export default async function AdminCoursesPage() {
  const [sections, allCourses] = await Promise.all([
    prisma.homepageSection.findMany({
      orderBy: { order: 'asc' },
      include: {
        courses: {
          orderBy: { homepageOrder: 'asc' },
          include: {
            modules: { include: { lessons: true } },
            _count: { select: { enrollments: true } },
          },
        },
      },
    }),
    prisma.course.findMany({
      where: { homepageSectionId: null },
      orderBy: { title: 'asc' },
      include: {
        modules: { include: { lessons: true } },
        _count: { select: { enrollments: true } },
      },
    }),
  ]);

  // Flatten course data into the lite shape the client component expects.
  const toLite = (c: typeof allCourses[number]) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    thumbnail: c.thumbnail,
    price: c.price,
    published: c.published,
    comingSoon: c.comingSoon,
    externalUrl: c.externalUrl,
    totalLessons: c.modules.reduce((acc, m) => acc + m.lessons.length, 0),
    enrollmentCount: c._count.enrollments,
  });

  const initialSections = sections.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    iconName: s.iconName,
    iconColor: s.iconColor,
    order: s.order,
    published: s.published,
    courses: s.courses.map(toLite),
  }));

  const initialUnassigned = allCourses.map(toLite);

  return (
    <CourseSectionsBoard
      initialSections={initialSections}
      initialUnassigned={initialUnassigned}
    />
  );
}
