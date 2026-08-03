'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DD_LEADS_COOKIE, ddLeadsCookieValue, verifyDdLeadsPassword } from '@/lib/dd-leads';

export async function ddLeadsLogin(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');
  if (!verifyDdLeadsPassword(password)) {
    redirect('/dd-leads?error=1');
  }
  const value = ddLeadsCookieValue();
  if (!value) redirect('/dd-leads?error=1');
  const jar = await cookies();
  jar.set(DD_LEADS_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90, // 90 days — sales guy shouldn't retype weekly
    path: '/dd-leads',
  });
  redirect('/dd-leads');
}
