import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as any).role;
  if (role !== 'ADMIN') return null;
  return session;
}

function parseCSV(csv: string): string[][] {
  const lines = csv.trim().split('\n');
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { csv } = body;

    if (!csv) {
      return NextResponse.json({ error: 'CSV content required' }, { status: 400 });
    }

    const rows = parseCSV(csv);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV must have header and at least one data row' }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const data = rows.slice(1);

    const stats = { users: 0, enrollments: 0, skipped: 0 };
    const errors: string[] = [];

    for (const row of data) {
      const item: Record<string, string> = {};
      headers.forEach((h, i) => {
        item[h] = row[i] || '';
      });

      const email = item.email?.toLowerCase();
      if (!email) {
        errors.push('Row missing email');
        stats.skipped++;
        continue;
      }

      // Check if user exists
      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Create user
        const passwordHash = item.password
          ? await bcrypt.hash(item.password, 10)
          : await bcrypt.hash('changeme123', 10);

        const role = ['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(item.role?.toUpperCase())
          ? (item.role.toUpperCase() as 'STUDENT' | 'INSTRUCTOR' | 'ADMIN')
          : 'STUDENT';

        user = await prisma.user.create({
          data: {
            email,
            name: item.name || null,
            passwordHash,
            mustChangePassword: true,
            role,
          },
        });
        stats.users++;
      }

      // Handle enrollments
      const courseSlugs = item.enroll_courses?.split(';').filter(Boolean) || [];
      for (const slug of courseSlugs) {
        const course = await prisma.course.findUnique({ where: { slug: slug.trim() } });
        if (!course) {
          errors.push(`Course not found: ${slug}`);
          continue;
        }

        const existing = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
        });

        if (!existing) {
          await prisma.enrollment.create({
            data: {
              userId: user.id,
              courseId: course.id,
              source: 'csv-import',
            },
          });
          stats.enrollments++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${stats.users} users, ${stats.enrollments} enrollments`,
      stats,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import users error:', error);
    return NextResponse.json(
      { error: 'Failed to import', details: String(error) },
      { status: 500 }
    );
  }
}
