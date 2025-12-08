'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Check, Clock } from 'lucide-react';

interface CourseCardProps {
  id: string;
  title: string;
  author?: string;
  thumbnail?: string;
  badge?: string;
  learningPoints?: string[];
  slug: string;
  comingSoon?: boolean;
}

export function CourseCard({
  id,
  title,
  author = 'TODD PULTZ',
  thumbnail,
  badge = 'COURSE',
  learningPoints = [],
  slug,
  comingSoon = false,
}: CourseCardProps) {
  const [showLearning, setShowLearning] = useState(false);

  const cardContent = (
    <div className={`bg-white rounded-xl overflow-hidden shadow-card transition-all duration-300 ${
      comingSoon
        ? 'cursor-not-allowed'
        : 'hover:-translate-y-1.5 hover:shadow-card-hover'
    }`}>
      {/* Thumbnail */}
      <div className="relative">
        {thumbnail ? (
          <div className={`w-full aspect-video relative bg-gradient-to-br from-[#1a3a4a] to-[#0d1f29] ${
            comingSoon ? 'grayscale' : ''
          }`}>
            <Image
              src={thumbnail}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className={`w-full aspect-video bg-gradient-to-br from-[#1a3a4a] to-[#0d1f29] flex flex-col items-center justify-center text-white text-center p-5 ${
            comingSoon ? 'grayscale' : ''
          }`}>
            <h3 className="text-lg font-extrabold uppercase leading-tight mb-2.5">
              {title}
            </h3>
            <span className="text-[11px] bg-maxxed-blue px-3 py-1.5 rounded font-semibold uppercase tracking-wider">
              {badge}
            </span>
          </div>
        )}

        {/* Coming Soon Overlay */}
        {comingSoon && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2 rounded-lg shadow-lg transform -rotate-3">
              <span className="text-white font-bold text-lg uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Coming Soon
              </span>
            </div>
          </div>
        )}

        {/* Coming Soon Tag */}
        {comingSoon && (
          <div className="absolute top-3 right-3">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
              Coming Soon
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`p-6 text-center ${comingSoon ? 'opacity-60' : ''}`}>
        <h4 className="text-lg font-bold text-text-dark mb-2 leading-tight">
          {title}
        </h4>
        <p className="text-[11px] text-text-muted uppercase tracking-[2px] mb-5">
          {author}
        </p>

        {/* What You'll Learn Toggle - Hide for coming soon */}
        {!comingSoon && learningPoints.length > 0 && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowLearning(!showLearning);
              }}
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
        {comingSoon ? (
          <span className="inline-block px-8 py-3 border-2 border-gray-300 text-gray-400 text-xs font-bold uppercase tracking-wider rounded cursor-not-allowed">
            Coming Soon
          </span>
        ) : (
          <span className="inline-block px-8 py-3 border-2 border-maxxed-blue text-maxxed-blue text-xs font-bold uppercase tracking-wider no-underline rounded transition-all duration-300 hover:bg-maxxed-blue hover:text-white">
            View Course
          </span>
        )}
      </div>
    </div>
  );

  // If coming soon, don't wrap in Link
  if (comingSoon) {
    return cardContent;
  }

  return (
    <Link href={`/courses/${slug}`} className="block no-underline">
      {cardContent}
    </Link>
  );
}
