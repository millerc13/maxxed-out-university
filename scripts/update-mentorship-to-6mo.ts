import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COURSE_ID = 'ht_mentorship_12mo';
const NEW_THUMBNAIL = 'https://assets.cdn.filesafe.space/ZTzlr9OKa82mgQ8vn680/media/69e698966da81710db0b7af2.png';

async function main() {
  const course = await prisma.course.findUnique({
    where: { id: COURSE_ID },
    include: { modules: { include: { lessons: true } } },
  });

  if (!course) {
    console.log(`Course ${COURSE_ID} not found.`);
    return;
  }

  console.log(`Found: "${course.title}" (slug: ${course.slug})`);
  console.log(`  Old thumbnail: ${course.thumbnail}`);

  await prisma.course.update({
    where: { id: course.id },
    data: { thumbnail: NEW_THUMBNAIL },
  });
  console.log(`  New thumbnail: ${NEW_THUMBNAIL}`);

  const twelveMonthLessons = course.modules
    .flatMap((m) => m.lessons)
    .filter((l) => /12[\s-]?month/i.test(l.title));

  for (const lesson of twelveMonthLessons) {
    const newTitle = lesson.title.replace(/12([\s-])month/gi, '6$1month').replace(/12-Month/g, '6-Month');
    await prisma.lesson.update({ where: { id: lesson.id }, data: { title: newTitle } });
    console.log(`  Lesson: "${lesson.title}" → "${newTitle}"`);
  }
  if (twelveMonthLessons.length === 0) console.log('  No 12-month lessons found.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
