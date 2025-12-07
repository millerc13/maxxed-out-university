const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: 'cjmiller862@gmail.com' }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('Found user:', user.email);

  // Update user name if not set
  if (!user.name) {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: 'CJ Miller' }
    });
    console.log('Updated user name to CJ Miller');
  }

  // Get published courses
  const courses = await prisma.course.findMany({
    where: { published: true },
    select: { id: true, title: true, slug: true }
  });

  // Enroll user in Real Estate Fundamentals and Wholesaling Mastery
  const coursesToEnroll = courses.filter(c =>
    c.slug === 'real-estate-fundamentals' || c.slug === 'wholesaling-mastery'
  );

  for (const course of coursesToEnroll) {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        }
      },
      update: {},
      create: {
        userId: user.id,
        courseId: course.id,
        source: 'ghl',
        transactionId: 'txn_' + Math.random().toString(36).slice(2, 10),
        metadata: {
          purchaseDate: new Date().toISOString(),
          amount: course.slug === 'real-estate-fundamentals' ? 49700 : 29700,
          productName: course.title,
        }
      }
    });
    console.log('Enrolled in:', course.title);
  }

  // Add lesson progress for Real Estate Fundamentals
  const reCourse = courses.find(c => c.slug === 'real-estate-fundamentals');
  if (reCourse) {
    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId: reCourse.id } },
      orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
    });

    // Mark first 3 lessons as completed, 4th as in progress
    for (let i = 0; i < Math.min(4, lessons.length); i++) {
      const lesson = lessons[i];
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: user.id,
            lessonId: lesson.id,
          }
        },
        update: {},
        create: {
          userId: user.id,
          lessonId: lesson.id,
          completed: i < 3,
          completedAt: i < 3 ? new Date() : null,
          watchedSeconds: i < 3 ? lesson.videoDuration : Math.floor(lesson.videoDuration * 0.4),
          lastPosition: i < 3 ? lesson.videoDuration : Math.floor(lesson.videoDuration * 0.4),
        }
      });
      console.log('Progress:', lesson.title, i < 3 ? '(completed)' : '(in progress)');
    }
  }

  // Add some progress for Wholesaling Mastery (just started)
  const wsCourse = courses.find(c => c.slug === 'wholesaling-mastery');
  if (wsCourse) {
    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId: wsCourse.id } },
      orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
      take: 1,
    });

    if (lessons[0]) {
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: user.id,
            lessonId: lessons[0].id,
          }
        },
        update: {},
        create: {
          userId: user.id,
          lessonId: lessons[0].id,
          completed: true,
          completedAt: new Date(),
          watchedSeconds: lessons[0].videoDuration,
          lastPosition: lessons[0].videoDuration,
        }
      });
      console.log('Progress:', lessons[0].title, '(completed)');
    }
  }

  console.log('\nAll done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
