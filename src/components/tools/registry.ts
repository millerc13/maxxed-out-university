import type { ComponentType } from 'react';
import type { ToolHandle } from './ExportableToolShell';

export type ExportFormat = 'pdf' | 'excel' | 'docx';

export interface ToolRegistryEntry {
  component: () => Promise<{ default: ComponentType<any> }>;
  type: 'calculator' | 'tracker' | 'template' | 'script' | 'checklist';
  exportFormats: ExportFormat[];
}

export const TOOL_REGISTRY: Record<string, ToolRegistryEntry> = {
  // ── Existing Calculators ──
  'multi-family-calculator': {
    component: () => import('./MultiFamilyCalculator'),
    type: 'calculator',
    exportFormats: ['pdf', 'excel'],
  },
  'cap-rate-underwriter': {
    component: () => import('./CapRateUnderwriter'),
    type: 'calculator',
    exportFormats: ['pdf', 'excel'],
  },

  // ── New Calculators ──
  'fix-flip-calculator': {
    component: () => import('./calculators/FixFlipCalculator'),
    type: 'calculator',
    exportFormats: ['pdf', 'excel'],
  },
  'rental-property-analyzer': {
    component: () => import('./calculators/RentalPropertyAnalyzer'),
    type: 'calculator',
    exportFormats: ['pdf', 'excel'],
  },
  'rehab-estimator-worksheet': {
    component: () => import('./calculators/RehabEstimator'),
    type: 'calculator',
    exportFormats: ['pdf', 'excel'],
  },
  'sample-t12-analysis': {
    component: () => import('./calculators/T12Analysis'),
    type: 'calculator',
    exportFormats: ['pdf', 'excel'],
  },
  'investor-profile-worksheet': {
    component: () => import('./calculators/InvestorProfile'),
    type: 'calculator',
    exportFormats: ['pdf'],
  },

  // ── Trackers ──
  'deal-flow-tracker': {
    component: () => import('./trackers/DealFlowTracker'),
    type: 'tracker',
    exportFormats: ['excel'],
  },
  'kpi-dashboard': {
    component: () => import('./trackers/KpiDashboard'),
    type: 'tracker',
    exportFormats: ['excel'],
  },

  // ── Templates ──
  'assignment-contract-template': {
    component: () => import('./templates/AssignmentContract'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'deal-summary-template': {
    component: () => import('./templates/DealSummary'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'house-rules-addendum': {
    component: () => import('./templates/HouseRulesAddendum'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'maintenance-request-form': {
    component: () => import('./templates/MaintenanceRequest'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'rental-application': {
    component: () => import('./templates/RentalApplication'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'residential-lease-agreement': {
    component: () => import('./templates/ResidentialLease'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'vendor-contractor-list': {
    component: () => import('./templates/VendorContractorList'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'team-contact-sheet': {
    component: () => import('./templates/TeamContactSheet'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'cash-buyer-list': {
    component: () => import('./templates/CashBuyerList'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'twelve-month-action-plan': {
    component: () => import('./templates/TwelveMonthActionPlan'),
    type: 'template',
    exportFormats: ['pdf'],
  },

  // ── References ──
  'real-estate-glossary': {
    component: () => import('./references/RealEstateGlossary'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'creative-finance-cheat-sheet': {
    component: () => import('./references/CreativeFinanceCheatSheet'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'fix-flip-timeline': {
    component: () => import('./references/FixFlipTimeline'),
    type: 'template',
    exportFormats: ['pdf'],
  },
  'private-money-pitch-deck': {
    component: () => import('./references/PrivateMoneyPitchDeck'),
    type: 'template',
    exportFormats: ['pdf'],
  },

  // ── Checklists ──
  'tenant-screening-criteria': {
    component: () => import('./checklists/TenantScreeningCriteria'),
    type: 'checklist',
    exportFormats: ['pdf'],
  },
  'brrrr-refinance-checklist': {
    component: () => import('./checklists/BrrrrRefinanceChecklist'),
    type: 'checklist',
    exportFormats: ['pdf'],
  },
  'brrrr-scope-of-work': {
    component: () => import('./checklists/BrrrrScopeOfWork'),
    type: 'checklist',
    exportFormats: ['pdf'],
  },
  'contractor-agreement-checklist': {
    component: () => import('./checklists/ContractorAgreementChecklist'),
    type: 'checklist',
    exportFormats: ['pdf'],
  },
  'double-closing-checklist': {
    component: () => import('./checklists/DoubleClosingChecklist'),
    type: 'checklist',
    exportFormats: ['pdf'],
  },
  'sfh-deal-evaluation-checklist': {
    component: () => import('./checklists/SfhDealEvaluation'),
    type: 'checklist',
    exportFormats: ['pdf'],
  },

  // ── Scripts ──
  'agent-outreach-script': {
    component: () => import('./scripts/AgentOutreachScript'),
    type: 'script',
    exportFormats: ['pdf'],
  },
  'seller-call-script': {
    component: () => import('./scripts/SellerCallScript'),
    type: 'script',
    exportFormats: ['pdf'],
  },
  'seller-objection-handling': {
    component: () => import('./scripts/SellerObjectionHandling'),
    type: 'script',
    exportFormats: ['pdf'],
  },
};
