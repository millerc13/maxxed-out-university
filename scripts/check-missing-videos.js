const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    orderBy: { order: 'asc' },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: { title: true, videoUrl: true, order: true }
          }
        }
      }
    }
  });

  console.log('\n=== MISSING VIDEOS ===\n');
  courses.forEach((course, ci) => {
    const courseNum = ci + 1;
    const missing = [];
    let lessonCounter = 0;
    course.modules.forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        lessonCounter++;
        if (!lesson.videoUrl) {
          missing.push(`${courseNum}.${lessonCounter} ${lesson.title}`);
        }
      });
    });
    if (missing.length > 0) {
      console.log(`\n## ${courseNum}. ${course.title}`);
      missing.forEach(m => console.log(m));
    }
  });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
