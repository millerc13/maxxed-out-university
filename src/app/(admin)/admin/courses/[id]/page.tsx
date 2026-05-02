import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { CourseEditor } from '@/components/admin/CourseEditor';

interface CourseEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseEditPage({ params }: CourseEditPageProps) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        include: {
          lessons: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
      products: true,
      quizzes: {
        include: {
          _count: { select: { questions: true, attempts: true } },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // System-wide CAPI token fallback — masked for client display so the
  // Marketing tab can show "Using system token (EAAO…XXXX)" when the
  // per-course override is empty. We never ship the full value to the
  // browser, only the first/last 4 chars so the admin can eyeball that
  // it matches their Vercel env value.
  const sysToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  const systemCapiTokenMasked =
    sysToken && sysToken.length > 12
      ? `${sysToken.slice(0, 4)}…${sysToken.slice(-4)}`
      : sysToken
        ? '••••'
        : null;

  return <CourseEditor course={course} systemCapiTokenMasked={systemCapiTokenMasked} />;
}
