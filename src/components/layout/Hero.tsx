'use client';

import Image from 'next/image';

// Course thumbnail images for the mosaic
const mosaicImages = [
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/6938430a35652be0d603e258.jpeg', // Real Estate Empire Blueprint
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/696925afe125ef2f2c5283fc.jpeg', // Welcome to Real Estate Investing
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/6969269ce4cf749ad2130747.jpeg', // Deal Types
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/696927f5157367553e9eba29.jpeg', // Deal Flow
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69692a54ed7c36e7673f95d9.jpeg', // Deal Analysis
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69692af0ed7c3608ff3fb726.jpeg', // Funding Your Deals
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69692b72c7d9b5e31d0db2a8.jpeg', // The BRRRR Method
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69692c39197f71a223a4eecc.jpeg', // Property Management
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69692c8be4cf7429a1143e48.jpeg', // Fix & Flip Mastery
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69692cc94e42b915f0f1a623.jpeg', // Wholesaling Real Estate
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69692d7b15736731929fdb6c.jpeg', // Scaling to a Real Business
];

function MosaicRow({ reverse = false, offset = 0 }: { reverse?: boolean; offset?: number }) {
  // Duplicate images for seamless scrolling, with offset for variety
  const offsetImages = [...mosaicImages.slice(offset), ...mosaicImages.slice(0, offset)];
  const images = [...offsetImages, ...offsetImages, ...offsetImages];

  return (
    <div
      className={`flex gap-2.5 ${
        reverse ? 'animate-scroll-right' : 'animate-scroll-left'
      }`}
    >
      {images.map((src, index) => (
        <div
          key={index}
          className="flex-shrink-0 w-[180px] h-[101px] sm:w-[200px] sm:h-[112px] md:w-[280px] md:h-[158px] rounded-lg overflow-hidden bg-black/20"
        >
          <Image
            src={src}
            alt={`Course ${index + 1}`}
            width={280}
            height={158}
            sizes="280px"
            quality={80}
            className="w-full h-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative h-[280px] sm:h-[350px] md:h-[450px] overflow-hidden bg-gradient-hero">
      {/* Mosaic Background */}
      <div
        className="absolute -top-5 -left-12 -right-12 -bottom-5 flex flex-col gap-2.5 opacity-60"
        style={{ transform: 'perspective(1000px) rotateX(5deg)' }}
      >
        <MosaicRow offset={0} />
        <MosaicRow reverse offset={5} />
        <MosaicRow offset={10} />
        <MosaicRow reverse offset={3} />
        <MosaicRow offset={8} />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-hero-overlay z-[2]" />

      {/* Hero Content */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-[3] text-white px-4">
        <p className="text-xs md:text-sm tracking-[4px] md:tracking-[8px] uppercase mb-2.5 font-medium opacity-90">
          Welcome to
        </p>
        <h1 className="text-[28px] sm:text-3xl md:text-[52px] font-extrabold tracking-[4px] md:tracking-[12px] uppercase mb-4">
          TRAINING CENTER
        </h1>
        <p className="text-base md:text-xl font-semibold tracking-[2px] md:tracking-[3px]">
          MAXXED OUT UNIVERSITY
          <span className="block text-sm md:text-base opacity-80 mt-1.5">
            Business Education for Serious Entrepreneurs
          </span>
        </p>
      </div>
    </section>
  );
}
