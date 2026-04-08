import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint — called server-side by funnel deployments on each render.
// Auth is via the funnel's API key or subdomain lookup.
export async function GET(request: NextRequest) {
  const apiKey =
    request.headers.get('x-funnel-api-key') ??
    request.nextUrl.searchParams.get('apiKey');
  const subdomain = request.nextUrl.searchParams.get('subdomain');

  if (!apiKey && !subdomain) {
    return NextResponse.json({ error: 'Missing API key or subdomain' }, { status: 401 });
  }

  const deployment = await prisma.funnelDeployment.findFirst({
    where: apiKey ? { apiKey } : { subdomain },
    include: {
      config: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          thumbnail: true,
          shortDesc: true,
        },
      },
      featuredCourses: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          thumbnail: true,
          shortDesc: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!deployment) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  if (!deployment.active) {
    return NextResponse.json({ error: 'Funnel inactive' }, { status: 403 });
  }

  // Tell the funnel whether any active promo codes exist so it can show/hide the promo field.
  // Actual validation happens at /api/funnel/promo/validate when the user applies a code.
  const promoEnabled = deployment.course
    ? (await prisma.promoCode.count({
        where: {
          active: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          AND: {
            OR: [
              { applyToAll: true },
              { courses: { some: { id: deployment.course.id } } },
            ],
          },
        },
      })) > 0
    : false;

  // Fetch enabled payment providers so funnel can show the right checkout options
  const enabledProviders = (
    await prisma.paymentProvider.findMany({
      where: { enabled: true },
      select: { provider: true },
    })
  ).map((p) => p.provider);

  return NextResponse.json({
    course: deployment.course ?? null,
    featuredCourses: deployment.featuredCourses ?? [],
    enabledProviders: enabledProviders.length > 0 ? enabledProviders : ['stripe'],
    config: {
      headline: deployment.config?.headline ?? null,
      subheadline: deployment.config?.subheadline ?? null,
      bulletPoints: deployment.config?.bulletPoints ?? [],
      testimonials: deployment.config?.testimonials ?? [],
      ctaText: deployment.config?.ctaText ?? 'Enroll Now',
      featureCards: deployment.config?.featureCards ?? [],
      forYouIf: deployment.config?.forYouIf ?? [],
      coursesLabel: deployment.config?.coursesLabel ?? null,
      coursesHeadline: deployment.config?.coursesHeadline ?? null,
      coursesSubheadline: deployment.config?.coursesSubheadline ?? null,
      featureCardsLabel: deployment.config?.featureCardsLabel ?? null,
      featureCardsHeadline: deployment.config?.featureCardsHeadline ?? null,
      featureCardsSub: deployment.config?.featureCardsSub ?? null,
      vslVideoUrl: deployment.config?.vslVideoUrl ?? null,
      instructorImageUrl: deployment.config?.instructorImageUrl ?? null,
      bulletsLabel: deployment.config?.bulletsLabel ?? null,
      bulletsHeadline: deployment.config?.bulletsHeadline ?? null,
      bulletsSub: deployment.config?.bulletsSub ?? null,
      template: deployment.config?.template ?? 'classic',
    },
    promoEnabled,
  });
}
