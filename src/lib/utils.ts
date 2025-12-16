import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price in cents to display string
 * @param priceInCents - Price in cents (e.g., 9700 for $97)
 * @returns Formatted price string (e.g., "$97" or "$1,497")
 */
export function formatPrice(priceInCents: number | null | undefined): string {
  if (!priceInCents) return 'Free';
  const dollars = priceInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

/**
 * Get tier label based on price
 */
export function getPriceTier(priceInCents: number | null | undefined): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (!priceInCents) return { label: 'Free', color: 'text-green-600', bgColor: 'bg-green-100' };
  if (priceInCents <= 9700) return { label: 'Starter', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  if (priceInCents <= 150000) return { label: 'Accelerator', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  if (priceInCents <= 1000000) return { label: 'Pro', color: 'text-amber-600', bgColor: 'bg-amber-100' };
  return { label: 'Elite', color: 'text-maxxed-gold', bgColor: 'bg-amber-50' };
}
