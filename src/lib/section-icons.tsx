// Fixed registry of icons admins can pick for HomepageSection.iconName.
// Both /admin/homepage (picker) and the public homepage / catalog read from
// this map, so adding a new icon is a single-line change here.
import {
  Crown,
  Handshake,
  Star,
  Flame,
  Zap,
  Sparkles,
  BookOpen,
  Trophy,
  Award,
  Target,
  Rocket,
  Shield,
  Briefcase,
  Heart,
  GraduationCap,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  Video,
  Lock,
  Infinity as InfinityIcon,
  Phone,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

export const SECTION_ICONS: Record<string, LucideIcon> = {
  Crown,
  Handshake,
  Star,
  Flame,
  Zap,
  Sparkles,
  BookOpen,
  Trophy,
  Award,
  Target,
  Rocket,
  Shield,
  Briefcase,
  Heart,
  GraduationCap,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  Video,
  Lock,
  Infinity: InfinityIcon,
  Phone,
  MessageCircle,
};

export const SECTION_ICON_NAMES = Object.keys(SECTION_ICONS);

// Resolve a stored iconName back to a component. Falls back to BookOpen
// so a typo / removed icon never breaks the page.
export function getSectionIcon(name: string | null | undefined): LucideIcon {
  if (!name) return BookOpen;
  return SECTION_ICONS[name] ?? BookOpen;
}
