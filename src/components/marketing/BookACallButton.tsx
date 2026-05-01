import { Calendar } from 'lucide-react';
import { Button } from '@/components/apply/ui/Button';

export const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL ||
  'https://calendly.com/rebecca-nardi/maxxed-out-todd-pultz-mentorship-healthcare';

interface Props {
  variant?: 'primary' | 'outline' | 'outlineWhite' | 'dark' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

// Universal "Have more questions? Book a call with a team member" CTA
// shown at the end of every funnel + university lead/purchase flow when
// the source course has bookACallEnabled=true (default).
export function BookACallButton({
  variant = 'outline',
  size = 'lg',
  className,
  label = 'Book a call with our team',
}: Props) {
  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={className}
    >
      <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
        <Calendar className="w-4 h-4" />
        {label}
      </a>
    </Button>
  );
}
