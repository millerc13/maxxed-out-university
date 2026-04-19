import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { BookOpen, ArrowRight, Star, Clock, Sparkles, Zap, Crown, Flame, CheckCircle, Play, Handshake, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { getEffectiveEnrollments, getEnrolledBundleIds } from '@/lib/enrollment';

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
    where: { OR: [{ published: true }, { comingSoon: true }] },
    include: {
      modules: {
        include: { lessons: true },
      },
    },
    orderBy: [{ price: 'asc' }, { order: 'asc' }],
  });

  const enrolledCourseIds =
    session?.user?.id && !isCustomerView
      ? await getEffectiveEnrollments(session.user.id)
      : new Set<string>();

  const enrolledBundleIds =
    session?.user?.id && !isCustomerView
      ? await getEnrolledBundleIds(session.user.id)
      : new Set<string>();

  const progress =
    session?.user && !isCustomerView
      ? await prisma.lessonProgress.findMany({
          where: { userId: session.user.id, completed: true },
          select: { lessonId: true },
        })
      : [];
  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

  const coursesWithStats = courses.map((course) => {
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const completedLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.filter((l) => completedLessonIds.has(l.id)).length,
      0
    );
    const isEnrolled = enrolledCourseIds.has(course.id);
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isComingSoon = course.comingSoon;
    return { ...course, totalLessons, completedLessons, isEnrolled, progressPercent, isComingSoon };
  });

  const comingSoonCourses = coursesWithStats.filter((c) => c.isComingSoon);
  // Hide bundle child courses when user is enrolled in the parent bundle
  const catalogCourses = coursesWithStats.filter((c) => !c.isComingSoon && (!c.bundleId || !enrolledBundleIds.has(c.bundleId)));

  // External / application-only partner programs (no price, redirect off-site)
  const partnerPrograms = catalogCourses.filter((c) => (c as any).externalUrl);
  // Exclude partner programs from the regular price tiers
  const priceTierCourses = catalogCourses.filter((c) => !(c as any).externalUrl);

  const eliteTicket = priceTierCourses.filter((c) => c.price && c.price > PRICE_TIERS.HIGH.max);
  // Bundle courses (multi-module flagships) get their own "Full Courses" section
  const fullCourses = priceTierCourses.filter((c) => c.isBundle && c.price);
  // Partnership programs: high-ticket 1-on-1 / DFY (non-bundle), excluding bundles
  const highTicket = priceTierCourses.filter((c) => !c.isBundle && c.price && c.price > PRICE_TIERS.MID.max && c.price <= PRICE_TIERS.HIGH.max);
  const midTicket = priceTierCourses.filter((c) => !c.isBundle && c.price && c.price > PRICE_TIERS.LOW.max && c.price <= PRICE_TIERS.MID.max);
  const lowTicket = priceTierCourses.filter((c) => !c.isBundle && c.price && c.price <= PRICE_TIERS.LOW.max);
  const freeCourses = priceTierCourses.filter((c) => !c.isBundle && !c.price);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5f5f7]">

        {/* ══════════════════════════════════════════════════════
            ELITE + HIGH TICKET
            ══════════════════════════════════════════════════════ */}
        {(eliteTicket.length > 0 || highTicket.length > 0 || partnerPrograms.length > 0 || fullCourses.length > 0) && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-5 md:px-10 py-14">

              {/* ELITE */}
              {eliteTicket.length > 0 && (
                <section className="mb-14">
                  <SectionHeader icon={<Crown className="w-5 h-5 text-[#D4AF37]" />} title="Elite Access" label="Mentorship & Partnerships" />
                  <div className="space-y-5">
                    {eliteTicket.map((course) => (
                      <EliteCard key={course.id} course={course} />
                    ))}
                  </div>
                </section>
              )}

              {/* PARTNERSHIP PROGRAMS (high-ticket 1-on-1 / DFY + application-only external) */}
              {(highTicket.length > 0 || partnerPrograms.length > 0) && (
                <section className={fullCourses.length > 0 ? 'mb-14' : ''}>
                  <SectionHeader icon={<Handshake className="w-5 h-5 text-[#0000CC]" />} title="Partnership Programs" label="Featured" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...partnerPrograms, ...highTicket].map((course) => (
                      <FeaturedCard key={course.id} course={course} />
                    ))}
                  </div>
                </section>
              )}

              {/* FULL COURSES — flagship bundle courses (e.g. Real Estate Empire Blueprint) */}
              {fullCourses.length > 0 && (
                <section>
                  <SectionHeader icon={<Star className="w-5 h-5 text-amber-500" />} title="Full Courses" label="Complete Programs" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {fullCourses.map((course) => (
                      <FeaturedCard key={course.id} course={course} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}


        {/* ══════════════════════════════════════════════════════
            COMING SOON
            ══════════════════════════════════════════════════════ */}
        {comingSoonCourses.length > 0 && (
          <div className="max-w-7xl mx-auto px-5 md:px-10 pt-14 pb-4">
            <SectionHeader icon={<Clock className="w-5 h-5 text-[#0000CC]" />} title="Coming Soon" label="In Development" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {comingSoonCourses.map((course) => (
                <div
                  key={course.id}
                  className="relative flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm opacity-75"
                >
                  <div className="relative aspect-video">
                    {course.thumbnail ? (
                      <Image
                        src={course.thumbnail}
                        alt={course.title}
                        fill
                        sizes="33vw"
                        className="object-cover grayscale"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="bg-[#0000CC] text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-[#0000CC]/20">
                        <Clock className="w-3 h-3" />
                        Coming Soon
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-800 text-base line-clamp-1">
                      {course.title}
                    </h3>
                    {course.shortDesc && (
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1.5">
                        {course.shortDesc}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* ══════════════════════════════════════════════════════
            CORE TRAINING — Light section with strong cards
            ══════════════════════════════════════════════════════ */}
        {midTicket.length > 0 && (
          <div className="bg-white">
            <div className="max-w-7xl mx-auto px-5 md:px-10 py-14">
              <SectionHeader icon={<Flame className="w-5 h-5 text-orange-500" />} title="Core Training" label="Deep-dive courses" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {midTicket.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          </div>
        )}


        {/* ══════════════════════════════════════════════════════
            QUICK START
            ══════════════════════════════════════════════════════ */}
        {lowTicket.length > 0 && (
          <div className="max-w-7xl mx-auto px-5 md:px-10 py-14">
            <SectionHeader icon={<Zap className="w-5 h-5 text-[#0000CC]" />} title="Quick Start Guides & Tools" label="Get moving fast" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lowTicket.map((course) => (
                <CompactCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        )}


        {/* ══════════════════════════════════════════════════════
            FREE RESOURCES
            ══════════════════════════════════════════════════════ */}
        {freeCourses.length > 0 && (
          <div className="bg-white">
            <div className="max-w-7xl mx-auto px-5 md:px-10 py-14">
              <SectionHeader icon={<Sparkles className="w-5 h-5 text-green-500" />} title="Free Resources" label="Start for free" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
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


// ── SECTION HEADER ────────────────────────────────────────────
function SectionHeader({ icon, title, label, dark }: { icon: React.ReactNode; title: string; label: string; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className={`text-2xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      </div>
      <div className={`flex-1 h-px ${dark ? 'bg-[#0000CC]/30' : 'bg-[#0000CC]/15'}`} />
      <span className={`text-[11px] font-bold uppercase tracking-widest ${dark ? 'text-[#0000CC]/60' : 'text-[#0000CC]/50'}`}>{label}</span>
    </div>
  );
}


// ── ELITE SHOWCASE ────────────────────────────────────────────
function EliteCard({ course }: { course: any }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group relative flex flex-col md:flex-row rounded-2xl overflow-hidden border-2 border-[#D4AF37]/25 hover:border-[#D4AF37]/50 bg-gradient-to-r from-[#fdfaf3] to-white shadow-sm hover:shadow-xl transition-all duration-300"
    >
      {/* Gold shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

      {/* Thumbnail */}
      <div className="relative md:w-80 flex-shrink-0 aspect-video md:aspect-auto md:min-h-[220px] overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center">
            <Crown className="w-12 h-12 text-[#D4AF37]/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-7 md:p-10 flex flex-col justify-center">
        <span className="inline-flex items-center gap-1.5 text-[#D4AF37] text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3">
          <Crown className="w-3.5 h-3.5" /> Elite Access
        </span>
        <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight group-hover:text-[#0000CC] transition-colors line-clamp-2">
          {course.title}
        </h3>
        <p className="text-sm text-gray-400 mt-3 line-clamp-2 max-w-lg">
          {(course as any).shortDesc || course.description?.split('\n')[0]}
        </p>

        <div className="flex items-center gap-5 mt-8">
          {course.isEnrolled ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-green-600 text-sm font-bold">
                <CheckCircle className="w-4 h-4" /> Enrolled
              </span>
              <span className="text-xs text-gray-300 border-l border-gray-200 pl-5">{course.totalLessons} lessons</span>
              <div className="ml-auto inline-flex items-center gap-2 px-6 py-3 bg-[#0000CC] text-white text-sm font-extrabold rounded-xl shadow-lg transition-all">
                <Play className="w-4 h-4" /> Continue Learning
              </div>
            </>
          ) : (
            <>
              <span className="text-3xl font-black text-[#D4AF37]">{formatPrice(course.price)}</span>
              <span className="text-xs text-gray-300 border-l border-gray-200 pl-5">{course.totalLessons} lessons</span>
              <div className="ml-auto inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-white text-sm font-extrabold rounded-xl hover:bg-[#c5a028] shadow-lg shadow-[#D4AF37]/20 group-hover:shadow-[#D4AF37]/40 transition-all">
                Get Access <ArrowRight className="w-4 h-4" />
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}


// ── FEATURED CARD (light bg) ──────────────────────────────────
function FeaturedCard({ course }: { course: any }) {
  const isExternal = !!course.externalUrl;
  const cardClass = "group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300";
  const inner = (
    <>
      <div className="relative aspect-video overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex items-center justify-center">
            {isExternal ? (
              <Handshake className="w-10 h-10 text-white/20" />
            ) : (
              <BookOpen className="w-10 h-10 text-white/20" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4">
          {isExternal ? (
            <span className="bg-[#0000CC] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
              <Handshake className="w-3.5 h-3.5" /> Apply Only
            </span>
          ) : course.isEnrolled ? (
            <span className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Enrolled
            </span>
          ) : (
            <span className="bg-[#0000CC] text-white px-3 py-1.5 rounded-lg text-sm font-extrabold shadow-lg shadow-[#0000CC]/25">
              {formatPrice(course.price)}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-[#0000CC] transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-2 mt-1.5 flex-1">
          {course.shortDesc || course.description?.split('\n')[0]}
        </p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {isExternal ? 'Application required' : `${course.totalLessons} lessons`}
          </span>
          {isExternal ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0000CC]/10 text-[#0000CC] text-xs font-bold rounded-lg group-hover:bg-[#0000CC] group-hover:text-white transition-all">
              Apply Now <ExternalLink className="w-3.5 h-3.5" />
            </span>
          ) : course.isEnrolled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 text-xs font-bold rounded-lg">
              <Play className="w-3.5 h-3.5" /> Continue
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0000CC]/10 text-[#0000CC] text-xs font-bold rounded-lg group-hover:bg-[#0000CC] group-hover:text-white transition-all">
              Get Access <ArrowRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </>
  );

  return isExternal ? (
    <a href={course.externalUrl} target="_blank" rel="noopener noreferrer" className={cardClass}>
      {inner}
    </a>
  ) : (
    <Link href={`/courses/${course.slug}`} className={cardClass}>
      {inner}
    </Link>
  );
}


// ── COURSE CARD (light bg, mid-tier + free) ───────────────────
function CourseCard({ course }: { course: any }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300"
    >
      <div className="relative aspect-video overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
        <div className="absolute bottom-3 left-3">
          {course.isEnrolled ? (
            <span className="bg-green-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Enrolled
            </span>
          ) : course.price ? (
            <span className="bg-white text-gray-900 px-2.5 py-1 rounded-lg text-sm font-extrabold shadow-md">
              {formatPrice(course.price)}
            </span>
          ) : (
            <span className="bg-green-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-md">
              FREE
            </span>
          )}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-[15px] text-gray-900 line-clamp-1 group-hover:text-[#0000CC] transition-colors">
          {course.title}
        </h3>
        <p className="text-[13px] text-gray-400 line-clamp-2 mt-1.5 flex-1 leading-relaxed">
          {(course as any).shortDesc || course.description?.split('\n')[0]}
        </p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">{course.totalLessons} lessons</span>
          <span className="text-xs font-bold text-[#0000CC] flex items-center gap-1 group-hover:gap-2 transition-all">
            View Course <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}


// ── COMPACT CARD ──────────────────────────────────────────────
function CompactCard({ course }: { course: any }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-video overflow-hidden">
        {course.thumbnail ? (
          <Image src={course.thumbnail} alt={course.title} fill sizes="25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-[#0000CC] transition-colors leading-snug flex-1">
          {course.title}
        </h3>
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100">
          <span className="text-[11px] text-gray-400">
            {course.totalLessons} {course.totalLessons === 1 ? 'lesson' : 'lessons'}
          </span>
          {course.isEnrolled ? (
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Enrolled
            </span>
          ) : (
            <span className="text-xs font-bold text-[#0000CC]">{formatPrice(course.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
