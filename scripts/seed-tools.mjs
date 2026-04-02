import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map new tool slugs to their courseId and metadata
// Using existing course IDs from the database
const TOOLS = [
  // ── Calculators ──
  { slug: 'fix-flip-calculator', title: 'Fix & Flip Calculator', description: 'Analyze fix & flip deals with purchase, rehab, holding, and selling cost projections.', icon: 'calculator', courseId: 'course_fix_flip', order: 1 },
  { slug: 'rental-property-analyzer', title: 'Rental Property Analyzer', description: 'Evaluate rental property deals with income, expense, and financing analysis.', icon: 'calculator', courseId: 'course_deal_analysis', order: 3 },
  { slug: 'rehab-estimator-worksheet', title: 'Rehab Estimator', description: 'Estimate rehab costs room by room with detailed line items.', icon: 'calculator', courseId: 'course_fix_flip', order: 2 },
  { slug: 'sample-t12-analysis', title: 'T12 Analysis', description: 'Trailing 12-month income and expense analysis for rental properties.', icon: 'spreadsheet', courseId: 'course_deal_analysis', order: 4 },
  { slug: 'investor-profile-worksheet', title: 'Investor Profile', description: 'Define your investment criteria, financial position, and goals.', icon: 'file-text', courseId: 'course_welcome_rei', order: 1 },

  // ── Trackers ──
  { slug: 'deal-flow-tracker', title: 'Deal Flow Tracker', description: 'Track leads, seller situations, offers, and follow-ups in one place.', icon: 'spreadsheet', courseId: 'course_deal_flow', order: 1 },
  { slug: 'kpi-dashboard', title: 'KPI Dashboard', description: 'Track weekly, monthly, and quarterly key performance indicators.', icon: 'bar-chart', courseId: 'course_scaling', order: 1 },

  // ── Templates ──
  { slug: 'assignment-contract-template', title: 'Assignment Contract', description: 'Wholesale assignment contract template with fill-in fields.', icon: 'file-text', courseId: 'course_wholesaling', order: 1 },
  { slug: 'deal-summary-template', title: 'Deal Summary', description: 'Present deals to partners and lenders with a professional summary.', icon: 'file-text', courseId: 'course_funding', order: 1 },
  { slug: 'house-rules-addendum', title: 'House Rules Addendum', description: 'Customizable house rules addendum for rental properties.', icon: 'file-text', courseId: 'course_property_mgmt', order: 1 },
  { slug: 'maintenance-request-form', title: 'Maintenance Request Form', description: 'Tenant maintenance request and resolution tracking form.', icon: 'file-text', courseId: 'course_property_mgmt', order: 2 },
  { slug: 'rental-application', title: 'Rental Application', description: 'Standard rental application with personal, employment, and reference sections.', icon: 'file-text', courseId: 'course_property_mgmt', order: 3 },
  { slug: 'residential-lease-agreement', title: 'Residential Lease Agreement', description: 'Comprehensive residential lease agreement template.', icon: 'scroll-text', courseId: 'course_property_mgmt', order: 4 },
  { slug: 'vendor-contractor-list', title: 'Vendor & Contractor List', description: 'Organize your team contacts by trade and specialty.', icon: 'list-checks', courseId: 'course_scaling', order: 2 },

  // ── Checklists ──
  { slug: 'brrrr-refinance-checklist', title: 'BRRRR Refinance Checklist', description: 'Step-by-step checklist for a smooth BRRRR refinance.', icon: 'clipboard-check', courseId: 'course_brrrr', order: 2 },
  { slug: 'brrrr-scope-of-work', title: 'BRRRR Scope of Work', description: 'Plan your BRRRR renovation with budget, timeline, and scope tracking.', icon: 'clipboard-check', courseId: 'course_brrrr', order: 3 },
  { slug: 'contractor-agreement-checklist', title: 'Contractor Agreement Checklist', description: 'Verify credentials and protect yourself before hiring contractors.', icon: 'clipboard-check', courseId: 'course_fix_flip', order: 3 },
  { slug: 'double-closing-checklist', title: 'Double Closing Checklist', description: 'Pre-closing, day-of, and post-closing checklist for double closes.', icon: 'clipboard-check', courseId: 'course_wholesaling', order: 2 },
  { slug: 'sfh-deal-evaluation-checklist', title: 'SFH Deal Evaluation', description: 'Evaluate single-family deals with property, financial, and market criteria.', icon: 'clipboard-check', courseId: 'course_deal_types', order: 1 },

  // ── Scripts ──
  { slug: 'agent-outreach-script', title: 'Agent Outreach Script', description: 'Scripts and templates for building your real estate agent network.', icon: 'phone', courseId: 'course_deal_flow', order: 2 },
  { slug: 'seller-call-script', title: 'Seller Call Script', description: 'Step-by-step seller call script with qualifying questions.', icon: 'phone', courseId: 'course_deal_flow', order: 3 },
  { slug: 'seller-objection-handling', title: 'Seller Objection Handling', description: 'Common seller objections with proven responses.', icon: 'phone', courseId: 'course_deal_flow', order: 4 },
];

async function main() {
  console.log('Seeding tools...');

  for (const tool of TOOLS) {
    const result = await prisma.tool.upsert({
      where: { slug: tool.slug },
      update: {
        title: tool.title,
        description: tool.description,
        icon: tool.icon,
        courseId: tool.courseId,
        order: tool.order,
        published: true,
      },
      create: {
        slug: tool.slug,
        title: tool.title,
        description: tool.description,
        icon: tool.icon,
        courseId: tool.courseId,
        order: tool.order,
        published: true,
      },
    });
    console.log(`  ✓ ${result.slug} → ${result.title}`);
  }

  console.log(`\nDone! ${TOOLS.length} tools seeded.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
