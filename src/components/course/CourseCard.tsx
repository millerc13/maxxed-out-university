'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Check, ExternalLink, CheckCircle, Play } from 'lucide-react';
import { formatPrice, getPriceTier } from '@/lib/utils';

interface CourseCardProps {
  id: string;
  title: string;
  author?: string;
  thumbnail?: string;
  badge?: string;
  learningPoints?: string[];
  slug: string;
  comingSoon?: boolean;
  price?: number | null;
  externalUrl?: string;
  shortDesc?: string | null;
  // True when the current user already owns this course (direct enrollment
  // or via a parent bundle). Replaces the price/Apply badge with an
  // "Enrolled" tag and the CTA with "Continue".
  enrolled?: boolean;
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
  price,
  externalUrl,
  shortDesc,
  enrolled = false,
}: CourseCardProps) {
  const [showLearning, setShowLearning] = useState(false);

  const cardContent = (
    <div className={`bg-white rounded-xl overflow-hidden shadow-card transition-all duration-300 h-full flex flex-col ${
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
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              quality={85}
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

        {/* Top-right badge: Enrolled wins, then Apply, then Price */}
        {!comingSoon && enrolled ? (
          <div className="absolute top-3 right-3">
            <span className="bg-green-500 text-white px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
              <CheckCircle className="w-3 h-3" /> Enrolled
            </span>
          </div>
        ) : !comingSoon && externalUrl ? (
          <div className="absolute top-3 right-3">
            <span className="bg-maxxed-blue text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
              Apply
            </span>
          </div>
        ) : !comingSoon && price !== undefined ? (() => {
          const tier = getPriceTier(price);
          return (
            <div className="absolute top-3 right-3">
              <span className={`${tier.bgColor} ${tier.color} px-2 py-1 rounded text-xs font-bold`}>
                {formatPrice(price)}
              </span>
            </div>
          );
        })() : null}

        {/* Coming Soon Tag - only show badge, no overlay */}
        {comingSoon && (
          <div className="absolute top-3 right-3">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
              Coming Soon
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`p-6 text-center flex flex-col flex-1 ${comingSoon ? 'opacity-60' : ''}`}>
        <h4 className="text-lg font-bold text-text-dark mb-2 leading-tight">
          {title}
        </h4>
        <p className="text-[11px] text-text-muted uppercase tracking-[2px] mb-3">
          {author}
        </p>
        {shortDesc && (
          <p className="text-sm text-text-body line-clamp-2 mb-5 leading-relaxed">
            {shortDesc}
          </p>
        )}

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

        {/* CTA Button — pinned to bottom of card */}
        <div className="mt-auto pt-2">
          {comingSoon ? (
            <span className="inline-block px-8 py-3 border-2 border-gray-300 text-gray-400 text-xs font-bold uppercase tracking-wider rounded cursor-not-allowed">
              Coming Soon
            </span>
          ) : enrolled ? (
            <span className="inline-flex items-center gap-2 px-8 py-3 border-2 border-green-600 bg-green-600 text-white text-xs font-bold uppercase tracking-wider rounded transition-all duration-300 hover:bg-green-700 hover:border-green-700">
              <Play className="w-3.5 h-3.5" /> Continue
            </span>
          ) : externalUrl ? (
            <span className="inline-flex items-center gap-2 px-8 py-3 border-2 border-maxxed-blue bg-maxxed-blue text-white text-xs font-bold uppercase tracking-wider rounded transition-all duration-300 hover:bg-maxxed-blue-dark hover:border-maxxed-blue-dark">
              Apply Now <ExternalLink className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="inline-block px-8 py-3 border-2 border-maxxed-blue text-maxxed-blue text-xs font-bold uppercase tracking-wider no-underline rounded transition-all duration-300 hover:bg-maxxed-blue hover:text-white">
              View Course
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Coming soon — not clickable
  if (comingSoon) {
    return <div className="h-full">{cardContent}</div>;
  }

  // External partner program — open in new tab
  if (externalUrl) {
    return (
      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="block no-underline h-full">
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={`/courses/${slug}`} className="block no-underline h-full">
      {cardContent}
    </Link>
  );
}
