import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { HomepageEditor } from '@/components/admin/HomepageEditor';

// /admin/homepage — controls which courses appear in which section on
// /, /courses, /dashboard. Sections + their assignments live in the
// HomepageSection table; both the public catalog and this editor read
// from it.
export default async function HomepageAdminPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || (role !== 'ADMIN' && role !== 'INSTRUCTOR')) {
    redirect('/login');
  }

  const [sections, allCourses] = await Promise.all([
    prisma.homepageSection.findMany({
      orderBy: { order: 'asc' },
      include: {
        courses: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            price: true,
            published: true,
            comingSoon: true,
            externalUrl: true,
            homepageOrder: true,
          },
          orderBy: { homepageOrder: 'asc' },
        },
      },
    }),
    prisma.course.findMany({
      where: { OR: [{ published: true }, { comingSoon: true }] },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
        price: true,
        published: true,
        comingSoon: true,
        externalUrl: true,
        homepageSectionId: true,
      },
      orderBy: { title: 'asc' },
    }),
  ]);

  return <HomepageEditor initialSections={sections} allCourses={allCourses} />;
}
