import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';

async function main() {
  const quizzes = await prisma.quiz.findMany({
    where: { published: true },
    include: {
      course: { select: { title: true } },
      questions: {
        orderBy: { order: 'asc' },
        include: { answers: { orderBy: { order: 'asc' } } },
      },
    },
    orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
  });

  const outPath = path.join(process.cwd(), 'quiz-answer-key.pdf');
  const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
  doc.pipe(fs.createWriteStream(outPath));

  // Cover
  doc.font('Times-Bold').fontSize(26).fillColor('#0000CC').text('Maxxed Out University', { align: 'center' });
  doc.moveDown(0.2);
  doc.font('Times-Italic').fontSize(14).fillColor('#555').text('Quiz Answer Key — Instructor Reference', { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Times-Roman').fontSize(10).fillColor('#888').text(new Date().toLocaleDateString(), { align: 'center' });
  doc.moveDown(2);
  doc.font('Times-Roman').fontSize(11).fillColor('#222').text(
    `Contains ${quizzes.length} quiz${quizzes.length === 1 ? '' : 'zes'} across all published courses. Correct answers are marked in blue with a check.`,
    { align: 'center' }
  );

  let lastCourse = '';
  for (const quiz of quizzes) {
    doc.addPage();
    const courseTitle = quiz.course?.title || '(No course)';
    if (courseTitle !== lastCourse) {
      doc.font('Times-Bold').fontSize(11).fillColor('#0000CC').text(courseTitle.toUpperCase(), { align: 'left' });
      lastCourse = courseTitle;
      doc.moveDown(0.2);
    }
    doc.font('Times-Bold').fontSize(18).fillColor('#111').text(quiz.title);
    doc.font('Times-Roman').fontSize(9).fillColor('#888').text(
      `Passing score: ${quiz.passingScore}%  •  ${quiz.questions.length} question${quiz.questions.length === 1 ? '' : 's'}`
    );
    doc.moveDown(0.8);

    quiz.questions.forEach((q, qi) => {
      if (doc.y > doc.page.height - 140) doc.addPage();
      doc.font('Times-Bold').fontSize(11).fillColor('#111').text(`${qi + 1}. ${q.text}`, { align: 'left' });
      doc.moveDown(0.3);

      q.answers.forEach((a) => {
        const isCorrect = a.isCorrect;
        const marker = isCorrect ? '[X]' : '[  ]';
        const color = isCorrect ? '#0000CC' : '#555';
        doc.font(isCorrect ? 'Times-Bold' : 'Times-Roman').fontSize(11).fillColor(color).text(
          `   ${marker}  ${a.text}`,
          { indent: 0 }
        );
      });

      if (q.explanation) {
        doc.moveDown(0.3);
        doc.font('Times-Italic').fontSize(10).fillColor('#555').text(`Why: ${q.explanation}`, { indent: 18 });
      }
      doc.moveDown(0.6);
    });
  }

  doc.end();
  await new Promise<void>((r) => doc.on('end', () => r()));
  console.log(`Wrote ${outPath}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
