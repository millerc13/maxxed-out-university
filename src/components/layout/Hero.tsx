'use client';

import Image from 'next/image';

// Course images for the mosaic
const mosaicImages = [
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c15e6551c6c516b9a80.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c1581eaa141f492d01a.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c16e0f0926027aef85b.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c1581eaa148b692d01b.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c1581eaa15cd392d018.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c1581eaa1e80b92d019.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c151d466e584fbdbec7.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c15e6551c55256b9a81.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c16a58be3379769327e.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c151d466ea1c6bdbec5.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c16a58be3c68369327f.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c15e0f0928a47aef856.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c151d466e2668bdbec6.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c15e6551cf60e6b9a82.png',
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69325c16a58be30e0969327d.png',
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
          className="flex-shrink-0 w-[200px] h-[130px] md:w-[200px] md:h-[130px] sm:w-[150px] sm:h-[100px] rounded-lg overflow-hidden"
        >
          <Image
            src={src}
            alt={`Course ${index + 1}`}
            width={200}
            height={130}
            className="w-full h-full object-cover"
            unoptimized
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
