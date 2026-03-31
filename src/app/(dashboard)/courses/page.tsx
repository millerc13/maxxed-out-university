import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { BookOpen, Play, CheckCircle, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, getPriceTier } from '@/lib/utils';

// Price tier boundaries in cents
const PRICE_TIERS = {
  LOW: { max: 9700, label: 'Quick Start Guides & Tools', description: 'Bite-sized training to get you moving fast' },
  MID: { min: 9701, max: 150000, label: 'Core Training', description: 'Deep-dive courses to build your skills' },
  HIGH: { min: 150001, max: 2500000, label: 'Full Courses & 1-on-1 Training', description: 'Comprehensive programs for serious investors' },
  ELITE: { min: 2500001, label: 'Elite Access', description: 'Direct mentorship and partnerships' },
};

export default async function CoursesPage() {
  const session = await auth();

  const cookieStore = await cookies();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isCustomerView = isAdmin && cookieStore.get('admin_customer_view')?.value === 'true';

  const courses = await prisma.course.findMany({
    where: { published: true },
    include: {
      modules: {
        include: { lessons: true },
      },
    },
    orderBy: [{ price: 'asc' }, { order: 'asc' }],
  });

  const enrollments =
    session?.user && !isCustomerView
      ? await prisma.enrollment.findMany({
          where: { userId: session.user.id },
          select: { courseId: true },
        })
      : [];

  const progress =
    session?.user && !isCustomerView
      ? await prisma.lessonProgress.findMany({
          where: { userId: session.user.id, completed: true },
          select: { lessonId: true },
        })
      : [];

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

  const coursesWithStats = courses.map((course) => {
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const completedLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.filter((l) => completedLessonIds.has(l.id)).length,
      0
    );
    const isEnrolled = enrolledCourseIds.has(course.id);
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isComingSoon = totalLessons === 0;
    return { ...course, totalLessons, completedLessons, isEnrolled, progressPercent, isComingSoon };
  });

  const showAllAsEnrolled = isAdmin && !isCustomerView;

  const getTierPriority = (price: number | null): number => {
    const p = price ?? 0;
    if (p > PRICE_TIERS.HIGH.max) return 0;
    if (p > PRICE_TIERS.MID.max) return 1;
    if (p > PRICE_TIERS.LOW.max) return 2;
    if (p > 0) return 3;
    return 4;
  };

  const sortByTier = <T extends { price: number | null; order: number }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => {
      const ta = getTierPriority(a.price);
      const tb = getTierPriority(b.price);
      if (ta !== tb) return ta - tb;
      const pa = a.price ?? 0;
      const pb = b.price ?? 0;
      if (pb !== pa) return pb - pa;
      return a.order - b.order;
    });

  const enrolledCourses = sortByTier(
    coursesWithStats.filter((c) => (showAllAsEnrolled || c.isEnrolled) && !c.isComingSoon)
  );
  const availableCourses = showAllAsEnrolled ? [] : coursesWithStats.filter((c) => !c.isEnrolled && !c.isComingSoon);

  const eliteTicket = availableCourses.filter((c) => c.price && c.price > PRICE_TIERS.HIGH.max);
  const highTicket = availableCourses.filter((c) => c.price && c.price > PRICE_TIERS.MID.max && c.price <= PRICE_TIERS.HIGH.max);
  const midTicket = availableCourses.filter((c) => c.price && c.price > PRICE_TIERS.LOW.max && c.price <= PRICE_TIERS.MID.max);
  const lowTicket = availableCourses.filter((c) => c.price && c.price <= PRICE_TIERS.LOW.max);
  const freeCourses = availableCourses.filter((c) => !c.price);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f7f7f8]">

        {/* ── MY COURSES — Dark owned zone ── */}
        {enrolledCourses.length > 0 && (
          <div
            className="bg-[#06091f]"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 20% 0%, rgba(0,0,200,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(212,175,55,0.06) 0%, transparent 50%)',
            }}
          >
            <div className="max-w-7xl mx-auto px-5 md:px-10 py-12">
              <div className="flex items-end justify-between mb-7">
                <div>
                  <p className="text-[#4a78d4] text-[10px] font-extrabold uppercase tracking-[0.22em] mb-1.5">
                    Your Training
                  </p>
                  <h2 className="text-2xl font-extrabold text-white leading-none">
                    My Courses{' '}
                    <span className="text-white/25 text-base font-medium ml-1">{enrolledCourses.length}</span>
                  </h2>
                </div>
                <Link
                  href="#catalog"
                  className="text-xs text-[#4a78d4] hover:text-white transition-colors font-semibold hidden md:block"
                >
                  Browse more →
                </Link>
              </div>

              <div className="flex flex-col gap-4">
                {enrolledCourses.map((course) => (
                  <EnrolledCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AVAILABLE PROGRAMS — Light catalog ── */}
        {availableCourses.length > 0 && (
          <div id="catalog" className="max-w-7xl mx-auto px-5 md:px-10 py-12">

            {enrolledCourses.length > 0 && (
              <div className="flex items-center gap-5 mb-12">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-gray-400 whitespace-nowrap">
                  Available Programs
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
            )}

            {/* ELITE — Showcase card */}
            {eliteTicket.length > 0 && (
              <section className="mb-14">
                <TierLabel>Elite Access</TierLabel>
                <div className="space-y-4">
                  {eliteTicket.map((course) => (
                    <EliteCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            )}

            {/* HIGH TICKET — 2-col featured */}
            {highTicket.length > 0 && (
              <section className="mb-14">
                <TierLabel>Full Courses & 1-on-1 Training</TierLabel>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {highTicket.map((course) => (
                    <FeaturedCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            )}

            {/* MID TICKET — 3-col standard */}
            {midTicket.length > 0 && (
              <section className="mb-14">
                <TierLabel>Core Training</TierLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {midTicket.map((course) => (
                    <StandardCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            )}

            {/* LOW TICKET — Compact grid */}
            <section className="mb-14">
              <TierLabel>Quick Start Guides & Tools</TierLabel>
              {lowTicket.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {lowTicket.map((course) => (
                    <CompactCard key={course.id} course={course} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-4">New quick start guides coming soon</p>
              )}
            </section>

            {/* FREE */}
            {freeCourses.length > 0 && (
              <section className="mb-14">
                <TierLabel>Free Resources</TierLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {freeCourses.map((course) => (
                    <StandardCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {courses.length === 0 && (
          <div className="max-w-7xl mx-auto px-5 md:px-10 py-24 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">No courses available</h2>
            <p className="text-gray-400">Check back soon for new content!</p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

// ── SECTION LABEL ──────────────────────────────────────────
function TierLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gray-400 whitespace-nowrap">
        {children}
      </h3>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── ENROLLED CARD ─────────────────────────────────────────
function EnrolledCard({ course }: { course: any }) {
  const isComplete = course.progressPercent === 100;
  const isStarted = course.progressPercent > 0;
  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference - (course.progressPercent / 100) * circumference;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex h-[148px] bg-[#0d1230] hover:bg-[#111840] border border-white/[0.08] hover:border-white/[0.18] rounded-xl overflow-hidden transition-all"
    >
      {/* Thumbnail */}
      <div className="relative w-56 flex-shrink-0">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="176px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white/20" />
          </div>
        )}
      </div>

      {/* Thin separator */}
      <div className="w-px bg-white/[0.06] flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-5 px-5">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-1 group-hover:text-blue-200 transition-colors">
            {course.title}
          </h3>
          <p className="text-[11px] text-white/30 mt-1">
            {course.completedLessons} of {course.totalLessons} lessons
          </p>
          <div className="mt-3 h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isComplete ? 'bg-green-400' : 'bg-[#D4AF37]'}`}
              style={{ width: `${course.progressPercent > 0 ? course.progressPercent : 0}%` }}
            />
          </div>
        </div>

        {/* Progress ring */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
              <circle
                cx="26" cy="26" r="22"
                fill="none"
                stroke={isComplete ? '#4ade80' : '#D4AF37'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={isStarted || isComplete ? strokeDashoffset : circumference}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {isComplete ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <Play className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
              )}
            </div>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${
            isComplete ? 'text-green-400' : isStarted ? 'text-[#D4AF37]' : 'text-white/25'
          }`}>
            {isComplete ? 'Done' : isStarted ? `${course.progressPercent}%` : 'Begin'}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── ELITE SHOWCASE CARD ────────────────────────────────────
function EliteCard({ course }: { course: any }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group relative flex flex-col md:flex-row gap-0 rounded-2xl overflow-hidden border border-[#D4AF37]/15 hover:border-[#D4AF37]/35 transition-all bg-[#0f0c00]"
      style={{ backgroundImage: 'radial-gradient(ellipse at 0% 50%, rgba(212,175,55,0.08) 0%, transparent 60%)' }}
    >
      {/* Thumbnail */}
      <div className="relative md:w-64 flex-shrink-0 aspect-video md:aspect-auto">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 100vw, 256px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#1a1200] flex items-center justify-center">
            <Star className="w-10 h-10 text-[#D4AF37]/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0f0c00] hidden md:block" />
      </div>

      {/* Content */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
        <div>
          <span className="inline-block text-[#D4AF37] text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3">
            Elite Access
          </span>
          <h3 className="text-xl md:text-2xl font-extrabold text-white leading-tight group-hover:text-[#D4AF37] transition-colors line-clamp-2">
            {course.title}
          </h3>
          <p className="text-sm text-white/40 mt-2 line-clamp-2">
            {(course as any).shortDesc || course.description?.split('\n')[0]}
          </p>
        </div>

        <div className="flex items-center gap-5 mt-6">
          <span className="text-2xl font-extrabold text-[#D4AF37]">{formatPrice(course.price)}</span>
          <span className="text-xs text-white/30">{course.totalLessons} lessons</span>
          <div className="ml-auto flex items-center gap-1.5 text-[#D4AF37] text-sm font-bold group-hover:gap-2.5 transition-all">
            Get Access <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── FEATURED 2-COL CARD ────────────────────────────────────
function FeaturedCard({ course }: { course: any }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-video">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-white/20" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="bg-black/60 text-white backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold">
            {formatPrice(course.price)}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-maxxed-blue transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-2 mt-1.5 flex-1">
          {(course as any).shortDesc || course.description?.split('\n')[0]}
        </p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">{course.totalLessons} lessons</span>
          <span className="text-sm font-bold text-maxxed-blue flex items-center gap-1 group-hover:gap-2 transition-all">
            Get Access <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── STANDARD 3-COL CARD ────────────────────────────────────
function StandardCard({ course }: { course: any }) {
  const tier = getPriceTier(course.price);
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-video">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="33vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white/20" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`${tier.bgColor} ${tier.color} px-2 py-0.5 rounded text-xs font-bold`}>
            {formatPrice(course.price)}
          </span>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-maxxed-blue transition-colors">
          {course.title}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 mt-1 flex-1">
          {(course as any).shortDesc || course.description?.split('\n')[0]}
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{course.totalLessons} lessons</span>
          <span className={`text-xs font-bold ${tier.color}`}>{tier.label}</span>
        </div>
      </div>
    </Link>
  );
}

// ── COMPACT GRID CARD ──────────────────────────────────────
function CompactCard({ course }: { course: any }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-maxxed-blue/25 hover:shadow-md transition-all"
    >
      <div className="relative aspect-video">
        {course.thumbnail ? (
          <Image src={course.thumbnail} alt={course.title} fill sizes="25vw" className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white/20" />
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-maxxed-blue transition-colors leading-snug flex-1">
          {course.title}
        </h3>
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100">
          <span className="text-[11px] text-gray-400">
            {course.totalLessons} {course.totalLessons === 1 ? 'lesson' : 'lessons'}
          </span>
          <span className="text-xs font-bold text-maxxed-blue">{formatPrice(course.price)}</span>
        </div>
      </div>
    </Link>
  );
}
