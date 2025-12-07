'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Target, TrendingUp, Users, Award } from 'lucide-react';

const benefits = [
  {
    icon: Target,
    title: 'Proven Strategies',
    description: 'Learn battle-tested methods that have generated millions in real estate profits.',
  },
  {
    icon: TrendingUp,
    title: 'Step-by-Step Training',
    description: 'Follow our comprehensive roadmap from beginner to advanced investor.',
  },
  {
    icon: Users,
    title: 'Community Support',
    description: 'Join a network of like-minded investors and get your questions answered.',
  },
  {
    icon: Award,
    title: 'Real Results',
    description: 'Our students have closed hundreds of deals using what they learned here.',
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
  return (
    <section className="py-20 px-5 md:px-10 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Top Section - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          {/* Left Column - Text */}
          <div>
            <h2 className="text-3xl md:text-[42px] font-bold text-text-dark mb-4 text-center lg:text-left">
              Master Real Estate Investing
            </h2>
            <p className="text-lg font-bold text-text-dark mb-6 text-center lg:text-left">
              Everything you need to build wealth through real estate
            </p>
            <ul className="list-none mb-8">
              {bulletPoints.map((point, index) => (
                <li
                  key={index}
                  className="relative pl-6 mb-3 text-[15px] text-text-body"
                >
                  <span className="absolute left-0 text-maxxed-blue text-xl leading-none">
                    •
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column - Image/Mockup */}
          <div className="relative">
            <div className="w-full h-80 bg-gradient-primary rounded-xl shadow-hero flex items-center justify-center relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-30">
                <div className="grid grid-cols-4 gap-2 p-4">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-full h-12 bg-white/10 rounded"
                    />
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="text-center text-white z-10">
                <p className="text-[11px] tracking-[3px] uppercase opacity-70 mb-2.5">
                  Maxxed Out
                </p>
                <p className="text-[28px] font-extrabold uppercase text-maxxed-gold mb-1.5">
                  UNIVERSITY
                </p>
                <p className="text-sm tracking-[2px] uppercase mb-4">
                  Training Center
                </p>
                <p className="text-2xl font-bold">
                  100+
                  <span className="block text-sm opacity-80">
                    Video Lessons
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                <benefit.icon className="w-[60px] h-[60px] stroke-maxxed-gold stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-bold uppercase text-text-dark mb-3 tracking-wider">
                {benefit.title}
              </h4>
              <p className="text-[13px] text-text-body leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-5 mb-16">
          <Link
            href="/courses"
            className="inline-block px-10 py-4 bg-maxxed-blue text-white text-sm font-bold uppercase tracking-wider no-underline rounded transition-all duration-300 hover:bg-maxxed-blue-dark hover:-translate-y-0.5 text-center"
          >
            Browse Courses
          </Link>
          <Link
            href="/login"
            className="inline-block px-10 py-4 border-2 border-maxxed-blue text-maxxed-blue text-sm font-bold uppercase tracking-wider no-underline rounded transition-all duration-300 hover:bg-maxxed-blue hover:text-white text-center"
          >
            Member Login
          </Link>
        </div>
      </div>
    </section>
  );
}
