import { Header, Hero, TrainingInfo, Footer } from '@/components/layout';
import type { Metadata } from 'next';
import { CoursesSection } from '@/components/course';
import { JsonLd } from '@/components/seo/JsonLd';
import { universityGraph } from '@/lib/seo/jsonld';

// Always render on request — course prices/publish state change in the DB
// and we don't want the homepage to serve stale pricing to visitors.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <>
      <JsonLd data={universityGraph()} />
      <Header />
      <main>
        <Hero />
        <CoursesSection />
        <TrainingInfo />
      </main>
      <Footer />
    </>
  );
}
