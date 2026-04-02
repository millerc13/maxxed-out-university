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

  return <CourseEditor course={course} />;
}
