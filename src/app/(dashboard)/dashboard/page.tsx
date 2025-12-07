import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, Trophy, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-10">
          {/* Welcome Section */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-text-dark mb-2">
              Welcome back{session.user.name ? `, ${session.user.name}` : ''}!
            </h1>
            <p className="text-text-body">
              Continue your learning journey where you left off.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-muted">
                  Enrolled Courses
                </CardTitle>
                <BookOpen className="w-5 h-5 text-maxxed-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-dark">0</div>
                <p className="text-xs text-text-muted mt-1">
                  Start learning today
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-muted">
                  Hours Watched
                </CardTitle>
                <Clock className="w-5 h-5 text-maxxed-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-dark">0h</div>
                <p className="text-xs text-text-muted mt-1">
                  Keep going!
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-muted">
                  Certificates
                </CardTitle>
                <Trophy className="w-5 h-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-dark">0</div>
                <p className="text-xs text-text-muted mt-1">
                  Complete courses to earn
                </p>
              </CardContent>
            </Card>
          </div>

          {/* My Courses Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-dark">My Courses</h2>
              <Link
                href="/courses"
                className="text-sm text-maxxed-blue hover:underline flex items-center gap-1"
              >
                Browse all courses
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Empty State */}
            <Card className="shadow-card">
              <CardContent className="py-16 text-center">
                <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <CardTitle className="text-xl mb-2">No courses yet</CardTitle>
                <CardDescription className="mb-6">
                  You haven&apos;t enrolled in any courses yet. Browse our catalog to get started.
                </CardDescription>
                <Link
                  href="/courses"
                  className="inline-block px-6 py-3 bg-maxxed-blue text-white font-bold text-sm uppercase tracking-wider rounded hover:bg-maxxed-blue-dark transition-colors"
                >
                  Browse Courses
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Continue Learning Section (placeholder) */}
          <div>
            <h2 className="text-xl font-bold text-text-dark mb-6">
              Continue Learning
            </h2>
            <Card className="shadow-card">
              <CardContent className="py-10 text-center">
                <p className="text-text-muted">
                  Your recently watched lessons will appear here.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
