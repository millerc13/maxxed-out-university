'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Check } from 'lucide-react';

interface CourseCardProps {
  id: string;
  title: string;
  author?: string;
  thumbnail?: string;
  badge?: string;
  learningPoints?: string[];
  slug: string;
}

export function CourseCard({
  id,
  title,
  author = 'TODD PULTZ',
  thumbnail,
  badge = 'COURSE',
  learningPoints = [],
  slug,
}: CourseCardProps) {
  const [showLearning, setShowLearning] = useState(false);

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover">
      {/* Thumbnail */}
      {thumbnail ? (
        <div className="w-full h-[180px] relative">
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-[180px] bg-gradient-dark flex flex-col items-center justify-center text-white text-center p-5">
          <h3 className="text-lg font-extrabold uppercase leading-tight mb-2.5">
            {title}
          </h3>
          <span className="text-[11px] bg-maxxed-blue px-3 py-1.5 rounded font-semibold uppercase tracking-wider">
            {badge}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-6 text-center">
        <h4 className="text-lg font-bold text-text-dark mb-2 leading-tight">
          {title}
        </h4>
        <p className="text-[11px] text-text-muted uppercase tracking-[2px] mb-5">
          {author}
        </p>

        {/* What You'll Learn Toggle */}
        {learningPoints.length > 0 && (
          <>
            <button
              onClick={() => setShowLearning(!showLearning)}
              className="inline-flex items-center gap-2 text-text-body text-[13px] font-medium mb-5 cursor-pointer transition-colors duration-300 hover:text-maxxed-blue"
            >
              What you&apos;ll learn
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-300 ${
                  showLearning ? 'rotate-90' : ''
                }`}
              />
            </button>

            {/* Learning Points Dropdown */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                showLearning ? 'max-h-[300px] mb-3' : 'max-h-0'
              }`}
            >
              <div className="bg-muted rounded-lg p-4 mt-3 text-left">
                <ul className="list-none p-0 m-0">
                  {learningPoints.map((point, index) => (
                    <li
                      key={index}
                      className="relative pl-5 mb-2 text-[13px] text-text-body leading-relaxed last:mb-0"
                    >
                      <Check className="absolute left-0 top-0.5 w-4 h-4 text-maxxed-blue" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {/* CTA Button */}
        <Link
          href={`/courses/${slug}`}
          className="inline-block px-8 py-3 border-2 border-maxxed-blue text-maxxed-blue text-xs font-bold uppercase tracking-wider no-underline rounded transition-all duration-300 hover:bg-maxxed-blue hover:text-white"
        >
          View Course
        </Link>
      </div>
    </div>
  );
}
