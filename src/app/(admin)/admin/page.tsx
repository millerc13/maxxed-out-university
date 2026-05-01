import { redirect } from 'next/navigation';

/**
 * /admin is now a thin redirect to Quick Links — Todd uses that page
 * 10x more often than the dashboard (handing out QRs / payment links
 * at events). The KPI dashboard lives at /admin/dashboard.
 */
export default function AdminRedirect() {
  redirect('/admin/quick-links');
}
