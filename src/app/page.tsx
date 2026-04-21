import { Header, Hero, TrainingInfo, Footer } from '@/components/layout';
import { CoursesSection } from '@/components/course';

// Always render on request — course prices/publish state change in the DB
// and we don't want the homepage to serve stale pricing to visitors.
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
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
