/** Registry of every embeddable GHL dashboard widget. */
export type WidgetDef = {
  id: string;
  title: string;
  description: string;
  /** Rough iframe height in px that fits the layout without scrolling. */
  suggestedHeight: number;
};

export const WIDGETS: WidgetDef[] = [
  {
    id: 'overview',
    title: 'Command Center (everything, one page)',
    description: 'The combined dashboard: revenue, offers, pipelines, cohort, calls, Calendly, webinar, funnels, leads, students, contracts and checkout links — deduplicated, with buyer names deep-linking to GHL contacts.',
    suggestedHeight: 2400,
  },
  {
    id: 'revenue',
    title: 'Revenue — All Rails',
    description: 'Blended gross/net revenue: Fanbasis + GHL checkout + University Stripe, with 30-day trend and recent transactions.',
    suggestedHeight: 760,
  },
  {
    id: 'offers',
    title: 'Revenue by Offer',
    description: 'Every sale bucketed into canonical offers (Blueprint, Mentorship, Cohort, VIP, Inner Circle, Accelerator, Mastermind LIVE).',
    suggestedHeight: 700,
  },
  {
    id: 'cohort',
    title: 'Medicaid 12-Week Cohort',
    description: 'Cohort applications → calls → enrollments, tier mix, closer split, payment plans in flight.',
    suggestedHeight: 760,
  },
  {
    id: 'leads',
    title: 'Leads & Applications',
    description: 'Funnel applications across all offers: daily volume, source mix, latest applicants.',
    suggestedHeight: 760,
  },
  {
    id: 'webinar',
    title: 'Webinar Funnel',
    description: 'Live webinar engine: registrations, show-up rate, VIP conversion, A/B test, upcoming sessions.',
    suggestedHeight: 760,
  },
  {
    id: 'funnels',
    title: 'Funnel Traffic & Conversion',
    description: 'PostHog traffic for every *.maxxedout.com funnel: views, visitors, CTA rate, checkouts, enrollments.',
    suggestedHeight: 760,
  },
  {
    id: 'pipelines',
    title: 'GHL Pipelines',
    description: 'All GHL opportunities by pipeline with open value and purchased counts.',
    suggestedHeight: 520,
  },
  {
    id: 'appointments',
    title: 'GHL Appointments',
    description: 'Booked calls across every GHL calendar: next 14 days plus 30-day show rate.',
    suggestedHeight: 640,
  },
  {
    id: 'bookings',
    title: "Calendly — Rebecca's Bookings",
    description: 'Mentorship intro calls and Masterminds bookings from Calendly: booked/held/canceled + upcoming.',
    suggestedHeight: 680,
  },
  {
    id: 'students',
    title: 'University Engagement',
    description: 'Students, enrollments, weekly active learners, lesson completion and quiz pass rates.',
    suggestedHeight: 560,
  },
  {
    id: 'contracts',
    title: 'Contracts & E-Sign',
    description: 'Enrollment agreements: sent → viewed → signed funnel and outstanding contract value.',
    suggestedHeight: 560,
  },
  {
    id: 'checkout-links',
    title: 'Checkout Links & Promos',
    description: 'Closer-sent payment links (sent → clicked → paid) and active promo code usage.',
    suggestedHeight: 760,
  },
];
