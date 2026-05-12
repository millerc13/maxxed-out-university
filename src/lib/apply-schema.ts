import { z } from 'zod';

/**
 * Application schema for the on-platform /apply/[slug] flow.
 * Mirrors `university-funnel/src/lib/schema.ts` so the two repos
 * validate the same payload. Keep these in sync.
 *
 * Only name/email/phone are required — everything else is optional
 * so users aren't gated mid-form and partial submissions can still
 * capture as leads.
 */

export const revenueOptions = [
  'No deals yet — ready to start',
  'Under $50k/yr in real estate income',
  '$50k – $250k/yr',
  '$250k – $1M/yr',
  '$1M+/yr',
] as const;

export const teamSizeOptions = [
  'Just me',
  '2 – 5 people',
  '6 – 15 people',
  '16+ people',
] as const;

export const industryOptions = [
  'Wholesaling',
  'Fix & flip',
  'Buy & hold / rentals',
  'BRRRR',
  'Multifamily',
  'Commercial',
  'New to real estate',
  'Other',
] as const;

export const bottleneckOptions = [
  'Finding good deals',
  'Funding / access to capital',
  'Underwriting / deal analysis',
  'Scaling past the first few deals',
  'Systems / team / time',
  'Honestly, all of the above',
] as const;

export const commitmentOptions = [
  'Ready to move in the next 30 days',
  '30 – 60 days',
  '60 – 90 days',
  'Just exploring for now',
] as const;

export const heardAboutOptions = [
  "Todd's social / podcast",
  'A friend or investor',
  'An event / stage talk',
  'Google / search',
  'Other',
] as const;

export const applicationSchema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(7, 'Please enter a valid phone number'),
  businessName: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  revenue: z.enum(revenueOptions).optional(),
  teamSize: z.enum(teamSizeOptions).optional(),
  industry: z.enum(industryOptions).optional(),
  bottleneck: z.enum(bottleneckOptions).optional(),
  vision: z.string().max(1200, "Let's keep it under 1200 characters").optional().or(z.literal('')),
  commitment: z.enum(commitmentOptions).optional(),
  bestTimes: z.array(z.string()).optional(),
  heardAbout: z.enum(heardAboutOptions).optional(),
  // `donewithyou` retained as a legacy value for in-flight submissions
  // mid-deploy after the rename to `business-mentorship`.
  program: z.enum(['business-mentorship', 'donewithyou', 'mentorship', 'blueprint', 'accelerator', 'university', 'experience']).optional(),
  partial: z.boolean().optional(),
  // Used on the university side: which course this application is for.
  courseId: z.string().optional(),
  courseSlug: z.string().optional(),
});

export type ApplicationPayload = z.infer<typeof applicationSchema>;
