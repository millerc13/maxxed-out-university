import {
  Calculator,
  TrendingUp,
  BarChart3,
  DollarSign,
  Building2,
  PieChart,
  FileSpreadsheet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export const TOOL_ICONS: Record<string, LucideIcon> = {
  calculator: Calculator,
  'trending-up': TrendingUp,
  'bar-chart': BarChart3,
  'dollar-sign': DollarSign,
  building: Building2,
  'pie-chart': PieChart,
  spreadsheet: FileSpreadsheet,
  wrench: Wrench,
};

export function getToolIcon(name: string | null | undefined): LucideIcon {
  return TOOL_ICONS[name || ''] || Calculator;
}
