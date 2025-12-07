'use client';

import Image from 'next/image';

// Sample images for the mosaic - these would be real course/event images
const mosaicImages = [
  '/images/BBV LIVE Day 1-134 (1).JPEG',
  '/images/book-cover.jpg',
  '/images/Screenshot 2025-12-01 at 12.48.27 PM.png',
  '/images/temp (1).webp',
  '/images/IMG_6643 (1).PNG',
  '/images/IMG_6645 (2).PNG',
];

function MosaicRow({ reverse = false }: { reverse?: boolean }) {
  // Duplicate images for seamless scrolling
  const images = [...mosaicImages, ...mosaicImages, ...mosaicImages];

  return (
    <div
      className={`flex gap-2.5 ${
        reverse ? 'animate-scroll-right' : 'animate-scroll-left'
      }`}
    >
      {images.map((src, index) => (
        <div
          key={index}
          className="flex-shrink-0 w-[200px] h-[130px] md:w-[200px] md:h-[130px] sm:w-[150px] sm:h-[100px] rounded-lg overflow-hidden"
        >
          <Image
            src={src}
            alt={`Training moment ${index + 1}`}
            width={200}
            height={130}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative h-[450px] md:h-[450px] sm:h-[280px] overflow-hidden bg-gradient-hero">
      {/* Mosaic Background */}
      <div
        className="absolute -top-5 -left-12 -right-12 -bottom-5 flex flex-col gap-2.5 opacity-60"
        style={{ transform: 'perspective(1000px) rotateX(5deg)' }}
      >
        <MosaicRow />
        <MosaicRow reverse />
        <MosaicRow />
        <MosaicRow reverse />
        <MosaicRow />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-hero-overlay z-[2]" />

      {/* Hero Content */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-[3] text-white px-4">
        <p className="text-xs md:text-sm tracking-[8px] md:tracking-[8px] sm:tracking-[4px] uppercase mb-2.5 font-medium opacity-90">
          Welcome to
        </p>
        <h1 className="text-3xl sm:text-[28px] md:text-[52px] font-extrabold tracking-[4px] sm:tracking-[4px] md:tracking-[12px] uppercase mb-4">
          TRAINING CENTER
        </h1>
        <p className="text-base sm:text-base md:text-xl font-semibold tracking-[2px] md:tracking-[3px]">
          MAXXED OUT UNIVERSITY
          <span className="block text-sm md:text-base opacity-80 mt-1.5">
            Real Estate Investment Education
          </span>
        </p>
      </div>
    </section>
  );
}
