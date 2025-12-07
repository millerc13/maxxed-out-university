'use client';

import { CourseCard } from './CourseCard';

// Sample courses data - will be replaced with real data from database
const sampleCourses = [
  {
    id: '1',
    title: 'Real Estate Fundamentals',
    slug: 'real-estate-fundamentals',
    badge: 'BEGINNER',
    learningPoints: [
      'Understanding real estate market basics',
      'How to analyze potential deals',
      'Financing options and strategies',
      'Building your investment portfolio',
    ],
  },
  {
    id: '2',
    title: 'Advanced Deal Analysis',
    slug: 'advanced-deal-analysis',
    badge: 'ADVANCED',
    learningPoints: [
      'Deep dive into property valuation',
      'Cash flow analysis techniques',
      'Risk assessment strategies',
      'Exit strategy planning',
    ],
  },
  {
    id: '3',
    title: 'Creative Financing',
    slug: 'creative-financing',
    badge: 'INTERMEDIATE',
    learningPoints: [
      'Seller financing strategies',
      'Subject-to transactions',
      'Lease options explained',
      'Private money lending',
    ],
  },
  {
    id: '4',
    title: 'Wholesaling Mastery',
    slug: 'wholesaling-mastery',
    badge: 'COURSE',
    learningPoints: [
      'Finding motivated sellers',
      'Contract negotiation tactics',
      'Building your buyers list',
      'Assignment fee maximization',
    ],
  },
  {
    id: '5',
    title: 'Fix & Flip Blueprint',
    slug: 'fix-flip-blueprint',
    badge: 'COURSE',
    learningPoints: [
      'Identifying profitable flips',
      'Renovation budgeting',
      'Contractor management',
      'Selling for maximum profit',
    ],
  },
  {
    id: '6',
    title: 'Rental Property Empire',
    slug: 'rental-property-empire',
    badge: 'ADVANCED',
    learningPoints: [
      'Building passive income streams',
      'Property management essentials',
      'Scaling your rental portfolio',
      'Tax optimization strategies',
    ],
  },
];

export function CoursesSection() {
  return (
    <section className="py-16 px-5 md:px-10 max-w-[1300px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sampleCourses.map((course) => (
          <CourseCard
            key={course.id}
            id={course.id}
            title={course.title}
            slug={course.slug}
            badge={course.badge}
            learningPoints={course.learningPoints}
          />
        ))}
      </div>
    </section>
  );
}
