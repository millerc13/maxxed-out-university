import { verifyEmbedKey } from '@/lib/embed-auth';
import { prisma } from '@/lib/prisma';
import { formatUsd } from '@/lib/embed/revenue';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { FunnelSteps } from '@/components/embed/FunnelSteps';
import { DataTable } from '@/components/embed/DataTable';
import { STATUS } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

export default async function CheckoutLinksWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('checkout-links', k)) return <EmbedDenied />;

  const [rawLinks, promos] = await Promise.all([
    prisma.checkoutLink.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        email: true,
        clickedAt: true,
        clickCount: true,
        paidAt: true,
        createdAt: true,
        courseId: true,
      },
    }),
    prisma.promoCode.findMany({
      where: { active: true },
      orderBy: { currentUses: 'desc' },
      take: 8,
      select: { code: true, discountType: true, discountValue: true, currentUses: true, maxUses: true },
    }),
  ]);

  const courses = await prisma.course.findMany({
    where: { id: { in: [...new Set(rawLinks.map((l) => l.courseId))] } },
    select: { id: true, title: true, price: true, salePrice: true },
  });
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const links = rawLinks.map((l) => ({ ...l, course: courseById.get(l.courseId) ?? null }));

  const clicked = links.filter((l) => l.clickedAt !== null).length;
  const paid = links.filter((l) => l.paidAt !== null).length;
  const paidValue = links
    .filter((l) => l.paidAt !== null)
    .reduce((a, l) => a + (l.course?.salePrice ?? l.course?.price ?? 0), 0);

  return (
    <EmbedShell title="Checkout Links & Promo Codes" subtitle="Closer-sent payment links: sent → clicked → paid">
      <StatGrid cols={4}>
        <Stat label="Links sent" value={String(links.length)} tone="brand" />
        <Stat label="Clicked" value={String(clicked)} sub={links.length ? `${((clicked / links.length) * 100).toFixed(0)}% click rate` : undefined} />
        <Stat label="Paid" value={String(paid)} tone="good" />
        <Stat label="Paid value" value={formatUsd(paidValue, { compact: true })} sub="course list/sale price" />
      </StatGrid>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card title="Link funnel">
          <FunnelSteps
            steps={[
              { label: 'Sent', value: links.length },
              { label: 'Clicked', value: clicked },
              { label: 'Paid', value: paid },
            ]}
          />
        </Card>
        <Card title="Active promo codes">
          <DataTable
            headers={['Code', 'Discount', 'Uses']}
            align={['l', 'l', 'r']}
            rows={promos.map((p) => [
              <b key="c">{p.code}</b>,
              p.discountType === 'PERCENTAGE' ? `${p.discountValue}% off` : `${formatUsd(p.discountValue)} off`,
              `${p.currentUses}${p.maxUses ? ` / ${p.maxUses}` : ''}`,
            ])}
          />
        </Card>
      </div>

      <Card title="Recent links" className="mt-3">
        <DataTable
          headers={['Sent to', 'Course', 'Clicks', 'Status', 'When']}
          align={['l', 'l', 'r', 'l', 'l']}
          rows={links.slice(0, 8).map((l) => [
            l.email ?? '—',
            <span key="c" className="line-clamp-1 max-w-[200px]">{l.course?.title ?? '—'}</span>,
            String(l.clickCount),
            l.paidAt ? (
              <span key="s" style={{ color: STATUS.good }} className="font-medium">paid</span>
            ) : l.clickedAt ? (
              <span key="s" style={{ color: STATUS.warning }} className="font-medium">clicked</span>
            ) : (
              <span key="s" style={{ color: STATUS.neutral }}>sent</span>
            ),
            l.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ])}
        />
      </Card>
    </EmbedShell>
  );
}
