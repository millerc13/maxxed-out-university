'use client';

import { Clock } from 'lucide-react';
import { CourseCard } from '@/components/course/CourseCard';
import { getSectionIcon } from '@/lib/section-icons';

// Renders the homepage catalog from in-memory data. Mirrors
// src/components/course/CoursesSection.tsx (the server component used on
// /), but takes its sections as a prop so the admin board can preview
// unsaved drafts without a server round-trip. Coming-soon courses are
// auto-collected into a hardcoded section at the top.
//
// We don't apply enrollment-aware filtering (no bundle-children hiding,
// no Enrolled badge) — the preview always shows what an unenrolled
// guest would see, matching `?previewAs=customer` on the live site.

interface PreviewCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  shortDesc?: string | null;
  price: number | null;
  published: boolean;
  comingSoon: boolean;
  externalUrl: string | null;
}

interface PreviewSection {
  id: string;
  title: string;
  description: string | null;
  iconName: string;
  iconColor: string | null;
  published: boolean;
  courses: PreviewCourse[];
}

export function SectionsCatalogPreview({
  sections,
  comingSoonCourses,
}: {
  sections: PreviewSection[];
  comingSoonCourses: PreviewCourse[];
}) {
  // Same filtering rules as CoursesSection.tsx:
  //  · only published sections show
  //  · drop comingSoon courses inside sections (they get the dedicated
  //    Coming Soon section at the top)
  const populatedSections = sections
    .filter((s) => s.published)
    .map((s) => ({
      ...s,
      courses: s.courses.filter((c) => !c.comingSoon),
    }))
    .filter((s) => s.courses.length > 0);

  const isEmpty = populatedSections.length === 0 && comingSoonCourses.length === 0;

  return (
    <section className="py-16 px-5 md:px-10 max-w-[1300px] mx-auto bg-white">
      {comingSoonCourses.length > 0 && (
        <SectionShell
          title="Coming Soon"
          description="New courses in development"
          icon={<Clock className="w-6 h-6 text-purple-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-75">
            {comingSoonCourses.map((c) => (
              <CourseCard
                key={c.id}
                id={c.id}
                title={c.title}
                slug={c.slug}
                thumbnail={c.thumbnail || undefined}
                badge="COMING SOON"
                learningPoints={[]}
                price={null}
                comingSoon
              />
            ))}
          </div>
        </SectionShell>
      )}

      {populatedSections.map((section) => {
        const Icon = getSectionIcon(section.iconName);
        return (
          <SectionShell
            key={section.id}
            title={section.title}
            description={section.description ?? ''}
            icon={
              <Icon className={`w-6 h-6 ${section.iconColor || 'text-[#0000CC]'}`} />
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {section.courses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  slug={course.slug}
                  thumbnail={course.thumbnail || undefined}
                  badge="COURSE"
                  learningPoints={[]}
                  price={course.price}
                  externalUrl={course.externalUrl ?? undefined}
                  shortDesc={course.shortDesc}
                />
              ))}
            </div>
          </SectionShell>
        );
      })}

      {isEmpty && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No courses to show.</p>
        </div>
      )}
    </section>
  );
}

function SectionShell({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-dark mb-1 flex items-center gap-3">
          {icon}
          {title}
        </h2>
        {description && <p className="text-text-body ml-9">{description}</p>}
      </div>
      {children}
    </div>
  );
}
