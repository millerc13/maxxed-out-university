import { Header, Hero, TrainingInfo, Footer } from '@/components/layout';
import { CoursesSection } from '@/components/course';

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
