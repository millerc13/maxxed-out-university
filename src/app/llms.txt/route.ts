import { headers } from 'next/headers';
import { CONNECT_HOST, CONNECT_URL, SITE_URL, SOCIALS, TODD_SITE_URL } from '@/lib/site';
import {
  effectivePriceCents,
  getIndexableCoursesSafe,
  isApplyOnly,
  factualSummary,
  type IndexableCourse,
} from '@/lib/public-courses';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
};

const RELATED_SITES = `## Related Maxxed Out sites

- [Todd Pultz](${TODD_SITE_URL}): Todd Pultz's personal site; master summary of every Maxxed Out property at ${TODD_SITE_URL}/llms.txt
- [Real Estate Empire Blueprint](https://blueprint.maxxedout.com): online real estate investing course with video modules, calculators, templates and lifetime access
- [6 Month Business Mentorship with Todd](https://mentorship.maxxedout.com): six-month mentorship with biweekly calls, deal reviews and network introductions; application required
- [Business Accelerator & Mentorship](https://business-mentorship.maxxedout.com): done-with-you funnel, CRM, ads and creative plus six months of 1-on-1 mentorship; application required
- [Ultimate Business Accelerator](https://accelerator.maxxedout.com): done-for-you websites, funnels, ads, automation and media; application required
- [Inner Circle Jet Experience](https://experience.maxxedout.com): private-jet immersion and mastermind with Todd Pultz; application required
- [Maxxed Out Webinars](https://webinar.maxxedout.com): free live masterclasses hosted by Todd Pultz
- [Connect with Todd](${CONNECT_URL}): contact form to work directly with Todd or get his social links by text`;

const ABOUT_TODD = `## About Todd Pultz

Todd Pultz is a Dayton, Ohio real estate investor, entrepreneur and speaker who founded Maxxed Out, hosts the podcast Maxxed Out with Todd Pultz, and wrote It's Just Real Estate, Dummy.

- Website: ${TODD_SITE_URL}
- Instagram: ${SOCIALS.instagram}
- Facebook: ${SOCIALS.facebook}
- YouTube: ${SOCIALS.youtube}
- TikTok: ${SOCIALS.tiktok}`;

function courseLine(c: IndexableCourse): string {
  const summary = factualSummary(c.shortDesc, 200) ?? factualSummary(c.description, 200);
  const cents = effectivePriceCents(c);
  const terms = isApplyOnly(c)
    ? 'Application required; pricing is discussed with the team.'
    : cents && cents > 0
      ? `Price: ${formatPrice(cents)} USD.`
      : null;
  const detail = [summary, terms].filter(Boolean).join(' ');
  return `- [${c.title}](${SITE_URL}/courses/${c.slug})${detail ? `: ${detail}` : ''}`;
}

function universityBody(courses: IndexableCourse[]): string {
  const applyOnly = courses.filter(isApplyOnly);
  const selfServe = courses.filter((c) => !isApplyOnly(c));

  const sections = [
    `# Maxxed Out University

> Business education and training for serious entrepreneurs. Maxxed Out University is the online training center of Maxxed Out, the education brand founded by Todd Pultz, covering real estate investing, healthcare services businesses, coaching and media.

Courses are delivered online through video training modules with downloadable resources and templates. The platform also lists live Q&A sessions with instructors, private community access and a certificate of completion. Coaching and mentorship programs are application-only: Todd's team reaches out within one business day with next steps.

## Main pages

- [Training Center (home)](${SITE_URL}/): course catalog grouped by topic
- [All courses](${SITE_URL}/courses): full public catalog`,
  ];

  if (applyOnly.length > 0) {
    sections.push(`## Programs (application required)\n\n${applyOnly.map(courseLine).join('\n')}`);
  }
  if (selfServe.length > 0) {
    sections.push(`## Courses, templates and tools\n\n${selfServe.map(courseLine).join('\n')}`);
  }

  sections.push(RELATED_SITES, ABOUT_TODD, `## Contact\n\n- Email: support@maxxedout.com`);
  return `${sections.join('\n\n')}\n`;
}

const CONNECT_BODY = `# Connect with Todd Pultz | Maxxed Out

> Contact page for Todd Pultz, founder of Maxxed Out. Visitors can ask to work directly with Todd or have his social links sent by text.

The page was first shared at the Becoming The Better You Tour in Leavenworth, Kansas ("How to Create Wealth Through Vertical Integration and Real Estate with Todd Pultz"). Submitting the form opts in to text messages from Maxxed Out (msg and data rates may apply; reply STOP to opt out).

- [Connect with Todd](${CONNECT_URL}/)
- [Maxxed Out University](${SITE_URL}/): online courses and programs; full summary at ${SITE_URL}/llms.txt
- [Todd Pultz](${TODD_SITE_URL}): personal site; master summary of every Maxxed Out property at ${TODD_SITE_URL}/llms.txt

${ABOUT_TODD}
`;

export async function GET() {
  const host = (await headers()).get('host') ?? '';
  if (host === CONNECT_HOST) {
    return new Response(CONNECT_BODY, { headers: TEXT_HEADERS });
  }
  const courses = await getIndexableCoursesSafe();
  return new Response(universityBody(courses), { headers: TEXT_HEADERS });
}
