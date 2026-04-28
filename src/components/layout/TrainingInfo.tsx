'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Target, TrendingUp, Users, Award, BookOpen } from 'lucide-react';

const benefits = [
  {
    icon: Target,
    title: 'Proven Strategies',
    description:
      'Learn battle-tested methods that have generated millions across real estate, healthcare, and beyond.',
  },
  {
    icon: TrendingUp,
    title: 'Step-by-Step Training',
    description: 'Follow our comprehensive roadmap from beginner to advanced operator.',
  },
  {
    icon: Users,
    title: 'Community Support',
    description: 'Join a network of like-minded entrepreneurs and get your questions answered.',
  },
  {
    icon: Award,
    title: 'Real Results',
    description: 'Our students have built businesses using what they learned here.',
  },
];

const bulletPoints = [
  'Complete video training modules',
  'Downloadable resources and templates',
  'Live Q&A sessions with instructors',
  'Private community access',
  'Certificate of completion',
];

export function TrainingInfo() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return (
    <section className="relative overflow-hidden py-20 px-5 md:px-10 bg-gradient-to-b from-white to-blue-50/40">
      {/* subtle blue glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(0,0,255,0.08) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(0,0,255,0.06) 0%, transparent 40%)',
        }}
      />

      <div className="relative max-w-[1200px] mx-auto">
        {/* Top Section — Two Column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          {/* Left — copy + bullets */}
          <div>
            <p className="text-maxxed-blue text-xs font-bold uppercase tracking-[3px] mb-3 text-center lg:text-left">
              Maxxed Out University
            </p>
            <h2 className="text-3xl md:text-[42px] font-extrabold text-text-dark mb-4 text-center lg:text-left leading-tight">
              Build the Business <span className="text-maxxed-blue">You Want</span>
            </h2>
            <p className="text-lg text-text-body mb-6 text-center lg:text-left leading-relaxed">
              Real estate, healthcare, coaching, media — pick your path and we&apos;ll help you scale it.
            </p>
            <ul className="list-none mb-2">
              {bulletPoints.map((point, index) => (
                <li
                  key={index}
                  className="relative pl-7 mb-3 text-[15px] text-text-body flex items-start gap-2"
                >
                  <svg
                    className="w-5 h-5 text-maxxed-blue flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — branded mockup */}
          <div className="relative">
            <div className="w-full h-80 bg-gradient-to-br from-[#0d1545] via-[#0a1a70] to-[#0000CC] rounded-2xl shadow-2xl shadow-[#0000CC]/20 flex items-center justify-center relative overflow-hidden">
              {/* Decorative dot grid */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, #fff 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
              {/* Glow */}
              <div
                className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full"
                style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,255,0.5) 0%, transparent 60%)' }}
              />

              <div className="relative text-center text-white z-10 px-6">
                <BookOpen className="w-10 h-10 mx-auto mb-4 text-blue-200/80" />
                <p className="text-[11px] tracking-[4px] uppercase text-blue-200/70 mb-2">
                  Maxxed Out
                </p>
                <p className="text-[28px] font-extrabold uppercase mb-1.5 tracking-wider">
                  UNIVERSITY
                </p>
                <p className="text-sm tracking-[2px] uppercase mb-5 text-blue-200/80">
                  Training Center
                </p>
                <div className="inline-flex items-baseline gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-2xl font-extrabold">100+</p>
                  <p className="text-sm opacity-90">Video Lessons</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="text-center bg-white rounded-2xl p-6 border border-blue-100/60 shadow-[0_2px_12px_rgba(0,0,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,255,0.10)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-xl bg-maxxed-blue/10">
                <benefit.icon className="w-7 h-7 text-maxxed-blue" strokeWidth={2} />
              </div>
              <h4 className="text-sm font-extrabold uppercase text-text-dark mb-2 tracking-wider">
                {benefit.title}
              </h4>
              <p className="text-[13px] text-text-body leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/courses"
            className="inline-block px-10 py-4 bg-maxxed-blue text-white text-sm font-extrabold uppercase tracking-wider no-underline rounded-lg shadow-md shadow-maxxed-blue/20 transition-all duration-300 hover:bg-maxxed-blue-dark hover:-translate-y-0.5 hover:shadow-lg text-center"
          >
            Browse Courses
          </Link>
          {!isAuthenticated && (
            <Link
              href="/login"
              className="inline-block px-10 py-4 border-2 border-maxxed-blue text-maxxed-blue text-sm font-extrabold uppercase tracking-wider no-underline rounded-lg transition-all duration-300 hover:bg-maxxed-blue hover:text-white hover:-translate-y-0.5 text-center"
            >
              Member Login
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
