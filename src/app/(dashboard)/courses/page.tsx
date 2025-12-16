import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Play, Lock, CheckCircle, ShoppingCart, Star, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, getPriceTier } from '@/lib/utils';

// Price tier boundaries in cents
const PRICE_TIERS = {
  LOW: { max: 9700, label: 'Starter Courses', description: 'Perfect for getting started' },
  MID: { min: 9701, max: 150000, label: 'Accelerator Programs', description: 'Take your investing to the next level' },
  HIGH: { min: 150001, max: 1000000, label: 'Coaching & Masterminds', description: 'High-touch guidance and community' },
  ELITE: { min: 1000001, label: 'Elite Access', description: 'Direct mentorship and partnerships' },
};

export default async function CoursesPage() {
  const session = await auth();

  // Check if admin is viewing as customer
  const cookieStore = await cookies();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isCustomerView = isAdmin && cookieStore.get('admin_customer_view')?.value === 'true';

  // Get all published courses
  const courses = await prisma.course.findMany({
    where: { published: true },
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
    orderBy: [{ price: 'asc' }, { order: 'asc' }],
  });

  // Get user's enrollments if logged in
  // If admin is in customer view, return empty array to simulate no enrollments
  const enrollments = (session?.user && !isCustomerView)
    ? await prisma.enrollment.findMany({
        where: { userId: session.user.id },
        select: { courseId: true },
      })
    : [];

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

  // Get user's progress if logged in
  // If admin is in customer view, return empty array
  const progress = (session?.user && !isCustomerView)
    ? await prisma.lessonProgress.findMany({
        where: { userId: session.user.id, completed: true },
        select: { lessonId: true },
      })
    : [];

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

  // Calculate stats for each course
  const coursesWithStats = courses.map((course) => {
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const completedLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.filter((l) => completedLessonIds.has(l.id)).length,
      0
    );
    const isEnrolled = enrolledCourseIds.has(course.id);
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isComingSoon = totalLessons === 0;

    return {
      ...course,
      totalLessons,
      completedLessons,
      isEnrolled,
      progressPercent,
      isComingSoon,
    };
  });

  // Separate enrolled from available, filter out coming soon
  const enrolledCourses = coursesWithStats.filter((c) => c.isEnrolled && !c.isComingSoon);
  const availableCourses = coursesWithStats.filter((c) => !c.isEnrolled && !c.isComingSoon);

  // Group available courses by price tier
  const lowTicket = availableCourses.filter((c) => c.price && c.price <= PRICE_TIERS.LOW.max);
  const midTicket = availableCourses.filter((c) => c.price && c.price > PRICE_TIERS.LOW.max && c.price <= PRICE_TIERS.MID.max);
  const highTicket = availableCourses.filter((c) => c.price && c.price > PRICE_TIERS.MID.max && c.price <= PRICE_TIERS.HIGH.max);
  const eliteTicket = availableCourses.filter((c) => c.price && c.price > PRICE_TIERS.HIGH.max);
  const freeCourses = availableCourses.filter((c) => !c.price);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-10">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-text-dark mb-2">Course Catalog</h1>
            <p className="text-text-body">
              From beginner resources to elite mentorship - find the right program for your journey.
            </p>
          </div>

          {/* My Courses Section (Enrolled) */}
          {enrolledCourses.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-dark">My Courses</h2>
                  <p className="text-sm text-text-muted">Courses you have access to</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => (
                  <EnrolledCourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          )}

          {/* Available Courses Header */}
          {availableCourses.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-maxxed-blue/10 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-maxxed-blue" />
                </div>
                <h2 className="text-xl font-bold text-text-dark">Available Courses</h2>
              </div>
              <p className="text-text-muted ml-12">
                Explore our complete education suite - from starter courses to elite mentorship
              </p>
            </div>
          )}

          {/* Free Courses */}
          {freeCourses.length > 0 && (
            <CourseTierSection
              title="Free Resources"
              description="Get started with no cost"
              icon={<Star className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-100"
              courses={freeCourses}
            />
          )}

          {/* Low Ticket Courses */}
          {lowTicket.length > 0 && (
            <CourseTierSection
              title={PRICE_TIERS.LOW.label}
              description={PRICE_TIERS.LOW.description}
              priceRange="$17 - $97"
              icon={<BookOpen className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-100"
              courses={lowTicket}
            />
          )}

          {/* Mid Ticket Courses */}
          {midTicket.length > 0 && (
            <CourseTierSection
              title={PRICE_TIERS.MID.label}
              description={PRICE_TIERS.MID.description}
              priceRange="$297 - $1,497"
              icon={<Sparkles className="w-5 h-5 text-purple-600" />}
              iconBg="bg-purple-100"
              courses={midTicket}
              featured
            />
          )}

          {/* High Ticket Courses */}
          {highTicket.length > 0 && (
            <CourseTierSection
              title={PRICE_TIERS.HIGH.label}
              description={PRICE_TIERS.HIGH.description}
              priceRange="$3,000 - $8,000"
              icon={<Star className="w-5 h-5 text-amber-600" />}
              iconBg="bg-amber-100"
              courses={highTicket}
            />
          )}

          {/* Elite Ticket Courses */}
          {eliteTicket.length > 0 && (
            <CourseTierSection
              title={PRICE_TIERS.ELITE.label}
              description={PRICE_TIERS.ELITE.description}
              priceRange="$15,000+"
              icon={<Sparkles className="w-5 h-5 text-maxxed-gold" />}
              iconBg="bg-gradient-to-br from-amber-100 to-yellow-100"
              courses={eliteTicket}
              elite
            />
          )}

          {courses.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-16 text-center">
                <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold text-text-dark mb-2">No courses available</h2>
                <p className="text-text-muted">
                  Check back soon for new content!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// Component for enrolled course cards
function EnrolledCourseCard({ course }: { course: any }) {
  return (
    <Card className="shadow-card overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
      <div className="relative aspect-video bg-gray-100">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-gray-300" />
          </div>
        )}
        {course.progressPercent === 100 && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Complete
          </div>
        )}
        {course.progressPercent > 0 && course.progressPercent < 100 && (
          <div className="absolute top-3 right-3 bg-maxxed-blue text-white px-2 py-1 rounded text-xs font-bold">
            {course.progressPercent}%
          </div>
        )}
      </div>
      <CardContent className="p-5">
        <h3 className="font-bold text-lg text-text-dark mb-2 line-clamp-1">
          {course.title}
        </h3>
        <p className="text-sm text-text-muted mb-4 line-clamp-2">
          {course.shortDesc || course.description}
        </p>
        <div className="flex items-center justify-between text-sm text-text-muted mb-4">
          <span>{course.completedLessons} / {course.totalLessons} lessons</span>
        </div>
        <div className="mb-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${course.progressPercent}%` }}
            />
          </div>
        </div>
        <Link
          href={`/courses/${course.slug}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-maxxed-blue text-white font-bold text-sm uppercase tracking-wider rounded hover:bg-maxxed-blue-dark transition-colors"
        >
          <Play className="w-4 h-4" />
          {course.progressPercent === 0 ? 'Start Learning' : 'Continue Learning'}
        </Link>
      </CardContent>
    </Card>
  );
}

// Component for course tier sections
function CourseTierSection({
  title,
  description,
  priceRange,
  icon,
  iconBg,
  courses,
  featured,
  elite,
}: {
  title: string;
  description: string;
  priceRange?: string;
  icon: React.ReactNode;
  iconBg: string;
  courses: any[];
  featured?: boolean;
  elite?: boolean;
}) {
  return (
    <section className={`mb-10 ${featured ? 'relative' : ''}`}>
      {featured && (
        <div className="absolute -inset-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl -z-10" />
      )}
      {elite && (
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl -z-10" />
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-dark">{title}</h3>
            <p className="text-sm text-text-muted">{description}</p>
          </div>
        </div>
        {priceRange && (
          <span className="text-sm font-medium text-text-muted bg-gray-100 px-3 py-1 rounded-full">
            {priceRange}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <AvailableCourseCard key={course.id} course={course} elite={elite} />
        ))}
      </div>
    </section>
  );
}

// Component for available (purchasable) course cards
function AvailableCourseCard({ course, elite }: { course: any; elite?: boolean }) {
  const tier = getPriceTier(course.price);

  return (
    <Card className={`shadow-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 ${elite ? 'border-2 border-amber-200' : ''}`}>
      <div className="relative aspect-video bg-gray-100">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-maxxed-blue/20 to-maxxed-gold/20">
            <BookOpen className="w-12 h-12 text-gray-400" />
          </div>
        )}
        {course.featured && (
          <div className="absolute top-3 left-3 bg-maxxed-gold text-white px-2 py-1 rounded text-xs font-bold">
            Featured
          </div>
        )}
        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <span className={`${tier.bgColor} ${tier.color} px-2 py-1 rounded text-xs font-bold`}>
            {formatPrice(course.price)}
          </span>
        </div>
      </div>
      <CardContent className="p-5">
        <h3 className="font-bold text-lg text-text-dark mb-2 line-clamp-1">
          {course.title}
        </h3>
        <p className="text-sm text-text-muted mb-4 line-clamp-2">
          {course.shortDesc || course.description}
        </p>

        <div className="flex items-center justify-between text-sm text-text-muted mb-4">
          <span>{course.totalLessons} lessons</span>
          <span>{course.modules.length} modules</span>
        </div>

        <Link
          href={`/courses/${course.slug}`}
          className={`flex items-center justify-center gap-2 w-full py-2.5 font-bold text-sm uppercase tracking-wider rounded transition-colors ${
            elite
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600'
              : 'border-2 border-maxxed-blue text-maxxed-blue hover:bg-maxxed-blue hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          {course.price ? 'Get Access' : 'Enroll Free'}
        </Link>
      </CardContent>
    </Card>
  );
}
