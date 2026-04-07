import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { isEffectivelyEnrolled } from '@/lib/enrollment';
import { Header, Footer } from '@/components/layout';
import { ArrowLeft, Lock, Wrench } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { TOOL_REGISTRY } from '@/components/tools/registry';
import { ToolRenderer } from '@/components/tools/ToolRenderer';

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const isAdmin = session.user.role === 'ADMIN';
  const isCustomerView = isAdmin && cookieStore.get('admin_customer_view')?.value === 'true';
  const bypassEnrollment = isAdmin && !isCustomerView;

  const tool = await prisma.tool.findUnique({
    where: { slug },
    include: { course: true },
  });

  if (!tool || !tool.published) {
    notFound();
  }

  // Check enrollment (direct or via bundle)
  const isEnrolled = bypassEnrollment || await isEffectivelyEnrolled(session.user.id!, tool.courseId);

  if (!isEnrolled) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#f5f5f7]">
          <div className="max-w-3xl mx-auto px-5 md:px-10 py-20 text-center">
            <div className="bg-white rounded-2xl shadow-sm p-12">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Access Required</h1>
              <p className="text-gray-500 mb-2">
                This tool is included with <strong>{tool.course.title}</strong>.
              </p>
              <p className="text-gray-500 mb-8">
                Enroll in the course to unlock this tool and all course materials.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/tools"
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Tools
                </Link>
                <Link
                  href={`/courses/${tool.course.slug}`}
                  className="px-5 py-2.5 bg-[#0000CC] text-white font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-[#0000aa] transition-colors"
                >
                  View Course
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const hasComponent = slug in TOOL_REGISTRY;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5f5f7]">
        {/* Breadcrumb + Title */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              <Link href="/tools" className="hover:text-[#0000CC] transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Tools
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{tool.title}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0000CC]/10 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-[#0000CC]" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900">{tool.title}</h1>
                  <p className="text-sm text-gray-500">
                    Included with <Link href={`/courses/${tool.course.slug}`} className="text-[#0000CC] hover:underline">{tool.course.title}</Link>
                  </p>
                </div>
              </div>
              <Image
                src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
                alt="Maxxed Out"
                width={140}
                height={55}
                className="h-10 w-auto hidden sm:block"
              />
            </div>
          </div>
        </div>

        {/* Tool Content */}
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-8">
          {hasComponent ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <ToolRenderer slug={slug} toolTitle={tool.title} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h2>
              <p className="text-gray-500">This tool is being built and will be available shortly.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
