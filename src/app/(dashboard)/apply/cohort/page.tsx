import type { Metadata } from 'next';
import Image from 'next/image';
import { CohortApplicationForm } from '@/components/apply/CohortApplicationForm';

/** Same hosted asset the site header uses, so branding matches everywhere. */
const LOGO_SRC =
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png';

/**
 * Public cohort application — the link Todd drops in the webinar chat at the
 * ~68 minute mark. Deliberately standalone (no site header/nav): nothing on
 * this page should compete with finishing the form. Not indexable.
 */
export const dynamic = 'force-dynamic';

const OG_TITLE = 'Apply for the 12-Week Cohort';
const OG_DESC = 'Takes about 2 minutes. Todd and his team are calling applicants tonight.';

/**
 * This link is pasted into Zoom chat live during the class, so the unfurl must
 * describe the application — without these the page inherited the site-wide
 * "Training Center | MaxxedOut" card. noindex still applies: it keeps the page
 * out of search results but does not affect link previews.
 */
export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESC,
  robots: { index: false, follow: false },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESC,
    type: 'website',
    siteName: 'Maxxed Out',
    url: 'https://university.maxxedout.com/apply/cohort',
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESC,
  },
};

export default function CohortApplyPage() {
  return (
    <div className="min-h-dvh bg-gray-50">
      <main className="mx-auto max-w-xl px-5 py-10 sm:py-14">
        <header className="text-center">
          {/* Branding matters here: this page asks for a phone number and a
              budget/readiness answer, so it has to read as unmistakably Todd's. */}
          <Image
            src={LOGO_SRC}
            alt="Maxxed Out"
            width={180}
            height={71}
            className="mx-auto mb-6 h-16 w-auto sm:h-20"
            unoptimized
            priority
          />
          <span className="inline-block rounded-full bg-blue-600/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-blue-700">
            Limited seats
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Apply for the 12-Week Cohort
          </h1>
          <p className="mt-3 text-gray-600">
            Takes about 2 minutes. My team and I are calling applicants tonight.
          </p>
        </header>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5 sm:p-8">
          <CohortApplicationForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Your information is only used to contact you about the cohort.
        </p>
        <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-widest text-gray-300">
          Maxxed Out · Todd Pultz
        </p>
      </main>
    </div>
  );
}
