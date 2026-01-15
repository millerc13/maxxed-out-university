import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  TableLayoutType,
  VerticalAlign,
  ShadingType,
  convertInchesToTwip,
  PageBreak,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Brand colors
const BRAND_BLUE = '1E3A5F';
const BRAND_GOLD = 'C9A227';
const DARK_TEXT = '333333';
const LIGHT_TEXT = '666666';
const TABLE_HEADER_BG = '1E3A5F';
const TABLE_ALT_ROW = 'F5F5F5';

// Load logo
const logoPath = path.join(process.cwd(), 'public', 'downloads', 'logo.png');
const logoBuffer = fs.readFileSync(logoPath);

interface TableData {
  headers: string[];
  rows: string[][];
}

interface Section {
  heading: string;
  content?: string[];
  table?: TableData;
  checklist?: string[];
  numberedList?: string[];
}

interface DocContent {
  title: string;
  subtitle: string;
  sections: Section[];
}

// Document content for each course
const courseDocuments: Record<string, DocContent> = {
  'les_lt_re_glossary': {
    title: 'Real Estate Glossary',
    subtitle: 'Essential Terms Every Investor Should Know',
    sections: [
      {
        heading: 'Property Types',
        table: {
          headers: ['Term', 'Definition'],
          rows: [
            ['SFH (Single Family Home)', 'A standalone residential property designed for one family'],
            ['Duplex', 'A building divided into two separate living units'],
            ['Triplex', 'A building with three separate living units'],
            ['Quadplex / Fourplex', 'A building with four separate living units'],
            ['Multifamily', 'Residential property with 5 or more units'],
            ['Mixed-Use', 'Property combining residential and commercial uses'],
          ]
        }
      },
      {
        heading: 'Investment Metrics',
        table: {
          headers: ['Metric', 'Formula / Definition'],
          rows: [
            ['ARV (After Repair Value)', 'Estimated market value after renovations are complete'],
            ['NOI (Net Operating Income)', 'Gross Income - Operating Expenses (excludes debt service)'],
            ['Cap Rate', 'NOI ÷ Property Value × 100'],
            ['Cash-on-Cash Return', 'Annual Cash Flow ÷ Total Cash Invested × 100'],
            ['DSCR', 'NOI ÷ Annual Debt Service (should be > 1.25)'],
            ['GRM (Gross Rent Multiplier)', 'Property Price ÷ Annual Gross Rent'],
          ]
        }
      },
      {
        heading: 'Investment Strategies',
        table: {
          headers: ['Strategy', 'Description'],
          rows: [
            ['Wholesale', 'Assign purchase contracts to other buyers for a fee'],
            ['Fix & Flip', 'Buy distressed, renovate, sell for profit'],
            ['BRRRR', 'Buy, Rehab, Rent, Refinance, Repeat'],
            ['Buy & Hold', 'Purchase properties for long-term rental income'],
            ['Subject-To', 'Take over existing mortgage payments'],
            ['Seller Financing', 'Seller acts as the bank, you make payments to them'],
          ]
        }
      },
      {
        heading: 'Financing Terms',
        table: {
          headers: ['Term', 'Definition'],
          rows: [
            ['LTV (Loan-to-Value)', 'Loan Amount ÷ Property Value'],
            ['Hard Money', 'Short-term, asset-based loans from private lenders'],
            ['Private Money', 'Loans from individual investors'],
            ['Conventional Loan', 'Traditional bank financing with standard terms'],
            ['DSCR Loan', 'Qualifies based on property income, not personal income'],
            ['Bridge Loan', 'Short-term financing to bridge between transactions'],
          ]
        }
      },
    ]
  },
  'les_lt_sfh_checklist': {
    title: 'SFH Deal Evaluation Checklist',
    subtitle: 'Systematic Property Analysis for Single Family Homes',
    sections: [
      {
        heading: 'Property Information',
        table: {
          headers: ['Field', 'Value'],
          rows: [
            ['Property Address', ''],
            ['Asking Price', '$'],
            ['Beds / Baths', '          /          '],
            ['Square Footage', ''],
            ['Year Built', ''],
            ['Lot Size', ''],
            ['Property Type', 'SFH / Townhouse / Condo'],
          ]
        }
      },
      {
        heading: 'Financial Analysis',
        table: {
          headers: ['Metric', 'Amount', 'Notes'],
          rows: [
            ['Estimated ARV', '$', ''],
            ['Repair Estimate', '$', ''],
            ['70% of ARV', '$', ''],
            ['Max Offer (70% - Repairs)', '$', ''],
            ['Monthly Rent Estimate', '$', ''],
            ['Annual Property Taxes', '$', ''],
            ['Annual Insurance', '$', ''],
          ]
        }
      },
      {
        heading: 'Condition Assessment',
        table: {
          headers: ['System', 'Condition', 'Est. Cost', 'Notes'],
          rows: [
            ['Roof', '☐ Good  ☐ Fair  ☐ Poor  ☐ Replace', '$', ''],
            ['HVAC', '☐ Good  ☐ Fair  ☐ Poor  ☐ Replace', '$', ''],
            ['Plumbing', '☐ Good  ☐ Fair  ☐ Poor', '$', ''],
            ['Electrical', '☐ Good  ☐ Fair  ☐ Poor', '$', ''],
            ['Foundation', '☐ Good  ☐ Fair  ☐ Poor', '$', ''],
            ['Windows/Doors', '☐ Good  ☐ Fair  ☐ Poor', '$', ''],
            ['Kitchen', '☐ Good  ☐ Fair  ☐ Poor', '$', ''],
            ['Bathrooms', '☐ Good  ☐ Fair  ☐ Poor', '$', ''],
            ['Flooring', '☐ Good  ☐ Fair  ☐ Poor', '$', ''],
          ]
        }
      },
      {
        heading: 'Deal Decision',
        checklist: [
          'ARV verified with 3+ comparable sales',
          'Repair estimate reviewed by contractor',
          'Meets minimum ROI threshold (     %)',
          'Exit strategy confirmed',
          'Financing secured or available',
          'Title search completed',
        ]
      },
    ]
  },
  'les_lt_mf_underwriting': {
    title: 'Multifamily Underwriting Worksheet',
    subtitle: 'Quick Analysis for 2-4 Unit Properties',
    sections: [
      {
        heading: 'Property Overview',
        table: {
          headers: ['Field', 'Value'],
          rows: [
            ['Property Address', ''],
            ['Number of Units', ''],
            ['Total Square Footage', ''],
            ['Year Built', ''],
            ['Asking Price', '$'],
            ['Price Per Unit', '$'],
            ['Price Per Sq Ft', '$'],
          ]
        }
      },
      {
        heading: 'Unit Mix & Rent Roll',
        table: {
          headers: ['Unit', 'Bed/Bath', 'Sq Ft', 'Current Rent', 'Market Rent'],
          rows: [
            ['Unit 1', '', '', '$', '$'],
            ['Unit 2', '', '', '$', '$'],
            ['Unit 3', '', '', '$', '$'],
            ['Unit 4', '', '', '$', '$'],
            ['TOTAL', '', '', '$', '$'],
          ]
        }
      },
      {
        heading: 'Income Analysis',
        table: {
          headers: ['Item', 'Monthly', 'Annual'],
          rows: [
            ['Gross Potential Rent', '$', '$'],
            ['Vacancy Loss (    %)', '$', '$'],
            ['Other Income', '$', '$'],
            ['Effective Gross Income', '$', '$'],
          ]
        }
      },
      {
        heading: 'Expense Analysis',
        table: {
          headers: ['Expense', 'Monthly', 'Annual'],
          rows: [
            ['Property Taxes', '$', '$'],
            ['Insurance', '$', '$'],
            ['Utilities (Owner Paid)', '$', '$'],
            ['Property Management (    %)', '$', '$'],
            ['Repairs & Maintenance', '$', '$'],
            ['CapEx Reserves', '$', '$'],
            ['Other', '$', '$'],
            ['Total Operating Expenses', '$', '$'],
          ]
        }
      },
      {
        heading: 'Returns Summary',
        table: {
          headers: ['Metric', 'Value', 'Target'],
          rows: [
            ['Net Operating Income (NOI)', '$', ''],
            ['Cap Rate', '%', '5-8%'],
            ['Cash Flow (after debt)', '$', ''],
            ['Cash-on-Cash Return', '%', '8-12%'],
            ['DSCR', '', '> 1.25'],
          ]
        }
      },
    ]
  },
  'les_lt_investor_profile': {
    title: 'Investor Profile Worksheet',
    subtitle: 'Define Your Investment Strategy & Goals',
    sections: [
      {
        heading: 'Investment Goals',
        table: {
          headers: ['Goal', 'Your Answer'],
          rows: [
            ['Primary Strategy', '☐ Wholesale  ☐ Flip  ☐ BRRRR  ☐ Buy & Hold'],
            ['12-Month Income Goal', '$'],
            ['5-Year Portfolio Goal', '          properties'],
            ['Target Monthly Cash Flow', '$          per property'],
            ['Target Net Worth Increase', '$          per year'],
          ]
        }
      },
      {
        heading: 'Current Financial Position',
        table: {
          headers: ['Resource', 'Amount'],
          rows: [
            ['Available Cash for Investing', '$'],
            ['Credit Score', ''],
            ['Annual W-2 Income', '$'],
            ['Self-Employment Income', '$'],
            ['Current Real Estate Holdings', '          properties'],
            ['Current Equity in Properties', '$'],
          ]
        }
      },
      {
        heading: 'Time & Resources',
        table: {
          headers: ['Factor', 'Your Situation'],
          rows: [
            ['Hours Available Per Week', '          hours'],
            ['Preferred Role', '☐ Active  ☐ Passive  ☐ Hybrid'],
            ['Team in Place', '☐ Yes  ☐ Building  ☐ Not Yet'],
            ['Market Knowledge', '☐ Expert  ☐ Intermediate  ☐ Beginner'],
          ]
        }
      },
      {
        heading: 'Target Property Criteria',
        table: {
          headers: ['Criteria', 'Your Preference'],
          rows: [
            ['Property Types', '☐ SFH  ☐ Small Multi  ☐ Large Multi  ☐ Commercial'],
            ['Target Markets', ''],
            ['Price Range', '$          to $'],
            ['Property Condition', '☐ Turnkey  ☐ Light Rehab  ☐ Heavy Rehab'],
            ['Minimum Cash Flow', '$          /month per unit'],
            ['Maximum Distance', '          miles from home'],
          ]
        }
      },
    ]
  },
  'les_lt_deal_flow_tracker': {
    title: 'Deal Flow Tracker',
    subtitle: 'Organize and Monitor Your Pipeline',
    sections: [
      {
        heading: 'Lead Information',
        table: {
          headers: ['Field', 'Details'],
          rows: [
            ['Date Received', ''],
            ['Property Address', ''],
            ['Seller Name', ''],
            ['Seller Phone', ''],
            ['Seller Email', ''],
            ['Lead Source', '☐ Direct Mail  ☐ PPC  ☐ Referral  ☐ Driving  ☐ Other'],
          ]
        }
      },
      {
        heading: 'Seller Situation',
        table: {
          headers: ['Factor', 'Details'],
          rows: [
            ['Motivation Level (1-10)', ''],
            ['Reason for Selling', ''],
            ['Timeline', '☐ Immediate  ☐ 30 Days  ☐ 60+ Days'],
            ['Mortgage Balance', '$'],
            ['Months Behind (if any)', ''],
            ['Other Liens', '$'],
          ]
        }
      },
      {
        heading: 'Property & Offer',
        table: {
          headers: ['Item', 'Amount'],
          rows: [
            ['Asking Price', '$'],
            ['Estimated ARV', '$'],
            ['Estimated Repairs', '$'],
            ['Max Offer (70% Rule)', '$'],
            ['Your Offer', '$'],
            ['Offer Date', ''],
          ]
        }
      },
      {
        heading: 'Pipeline Status',
        table: {
          headers: ['Stage', 'Date', 'Notes'],
          rows: [
            ['☐ New Lead', '', ''],
            ['☐ Contacted', '', ''],
            ['☐ Appointment Set', '', ''],
            ['☐ Appointment Complete', '', ''],
            ['☐ Offer Made', '', ''],
            ['☐ Under Contract', '', ''],
            ['☐ Closed', '', ''],
            ['☐ Dead Lead', '', ''],
          ]
        }
      },
      {
        heading: 'Follow-Up Log',
        table: {
          headers: ['Date', 'Method', 'Notes', 'Next Action'],
          rows: [
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
          ]
        }
      },
    ]
  },
  'les_lt_agent_script': {
    title: 'Agent Outreach Script',
    subtitle: 'Build Your Real Estate Agent Network',
    sections: [
      {
        heading: 'Initial Contact Script',
        content: [
          '"Hi [Agent Name], my name is [Your Name] and I\'m a local real estate investor."',
          '"I\'m looking to purchase [X] properties this year and I\'m building relationships with agents who enjoy working with investors."',
          '"Do you have a few minutes to chat about potentially working together?"',
        ]
      },
      {
        heading: 'Qualifying Questions to Ask',
        numberedList: [
          'How many investor clients do you currently work with?',
          'What areas or neighborhoods do you specialize in?',
          'How quickly can you typically schedule showings?',
          'Are you comfortable submitting offers significantly below asking price?',
          'Do you have access to pocket listings or off-market opportunities?',
          'What\'s your experience with distressed properties or REOs?',
        ]
      },
      {
        heading: 'Your Value Proposition',
        content: [
          '• I can close quickly — often within 2-3 weeks',
          '• I buy properties as-is with no inspection contingencies',
          '• I\'m looking to build a long-term relationship with one dedicated agent',
          '• I\'ll send you referrals for any retail buyers I encounter',
          '• I\'m decisive and won\'t waste your time on properties I won\'t buy',
        ]
      },
      {
        heading: 'Setting Expectations',
        table: {
          headers: ['Topic', 'What to Communicate'],
          rows: [
            ['Offer Style', 'I submit offers based on my numbers, often below asking'],
            ['Response Time', 'I respond to new listings within 24 hours'],
            ['Showings', 'I can view properties on short notice'],
            ['Closings', 'I use cash or hard money — fast closings'],
            ['Volume', 'I plan to purchase     properties this year'],
          ]
        }
      },
      {
        heading: 'Agent Tracking',
        table: {
          headers: ['Agent Name', 'Brokerage', 'Phone', 'Rating (1-5)', 'Notes'],
          rows: [
            ['', '', '', '', ''],
            ['', '', '', '', ''],
            ['', '', '', '', ''],
          ]
        }
      },
    ]
  },
  'les_lt_rehab_estimator': {
    title: 'Rehab Estimator Worksheet',
    subtitle: 'Accurate Repair Budgets for Any Project',
    sections: [
      {
        heading: 'Property Information',
        table: {
          headers: ['Field', 'Value'],
          rows: [
            ['Property Address', ''],
            ['Square Footage', ''],
            ['Bedrooms / Bathrooms', '          /          '],
            ['Year Built', ''],
            ['Inspection Date', ''],
          ]
        }
      },
      {
        heading: 'Exterior Repairs',
        table: {
          headers: ['Item', 'Needed?', 'Estimate', 'Actual'],
          rows: [
            ['Roof (repair/replace)', '☐ Yes  ☐ No', '$', '$'],
            ['Gutters & Downspouts', '☐ Yes  ☐ No', '$', '$'],
            ['Siding/Exterior Paint', '☐ Yes  ☐ No', '$', '$'],
            ['Windows', '☐ Yes  ☐ No', '$', '$'],
            ['Exterior Doors', '☐ Yes  ☐ No', '$', '$'],
            ['Driveway/Walkways', '☐ Yes  ☐ No', '$', '$'],
            ['Landscaping', '☐ Yes  ☐ No', '$', '$'],
            ['Fence/Deck', '☐ Yes  ☐ No', '$', '$'],
          ]
        }
      },
      {
        heading: 'Major Systems',
        table: {
          headers: ['System', 'Needed?', 'Estimate', 'Actual'],
          rows: [
            ['Electrical Panel Upgrade', '☐ Yes  ☐ No', '$', '$'],
            ['Electrical Wiring', '☐ Yes  ☐ No', '$', '$'],
            ['Plumbing (supply lines)', '☐ Yes  ☐ No', '$', '$'],
            ['Plumbing (drain lines)', '☐ Yes  ☐ No', '$', '$'],
            ['Water Heater', '☐ Yes  ☐ No', '$', '$'],
            ['HVAC System', '☐ Yes  ☐ No', '$', '$'],
            ['Ductwork', '☐ Yes  ☐ No', '$', '$'],
          ]
        }
      },
      {
        heading: 'Interior Finishes',
        table: {
          headers: ['Item', 'Needed?', 'Estimate', 'Actual'],
          rows: [
            ['Drywall Repair/Replace', '☐ Yes  ☐ No', '$', '$'],
            ['Interior Paint', '☐ Yes  ☐ No', '$', '$'],
            ['Flooring', '☐ Yes  ☐ No', '$', '$'],
            ['Trim & Baseboards', '☐ Yes  ☐ No', '$', '$'],
            ['Interior Doors', '☐ Yes  ☐ No', '$', '$'],
            ['Light Fixtures', '☐ Yes  ☐ No', '$', '$'],
          ]
        }
      },
      {
        heading: 'Kitchen',
        table: {
          headers: ['Item', 'Needed?', 'Estimate', 'Actual'],
          rows: [
            ['Cabinets', '☐ Yes  ☐ No', '$', '$'],
            ['Countertops', '☐ Yes  ☐ No', '$', '$'],
            ['Backsplash', '☐ Yes  ☐ No', '$', '$'],
            ['Sink & Faucet', '☐ Yes  ☐ No', '$', '$'],
            ['Appliances', '☐ Yes  ☐ No', '$', '$'],
          ]
        }
      },
      {
        heading: 'Bathrooms',
        table: {
          headers: ['Item', 'Needed?', 'Estimate', 'Actual'],
          rows: [
            ['Vanity & Top', '☐ Yes  ☐ No', '$', '$'],
            ['Toilet', '☐ Yes  ☐ No', '$', '$'],
            ['Tub/Shower', '☐ Yes  ☐ No', '$', '$'],
            ['Tile Work', '☐ Yes  ☐ No', '$', '$'],
            ['Fixtures & Accessories', '☐ Yes  ☐ No', '$', '$'],
          ]
        }
      },
      {
        heading: 'Budget Summary',
        table: {
          headers: ['Category', 'Estimated', 'Actual'],
          rows: [
            ['Exterior', '$', '$'],
            ['Major Systems', '$', '$'],
            ['Interior Finishes', '$', '$'],
            ['Kitchen', '$', '$'],
            ['Bathrooms', '$', '$'],
            ['Permits & Fees', '$', '$'],
            ['Subtotal', '$', '$'],
            ['Contingency (15-20%)', '$', '$'],
            ['TOTAL REHAB BUDGET', '$', '$'],
          ]
        }
      },
    ]
  },
  'les_lt_flip_calculator': {
    title: 'Fix & Flip Calculator',
    subtitle: 'Analyze Profitability Before You Buy',
    sections: [
      {
        heading: 'Deal Summary',
        table: {
          headers: ['Field', 'Value'],
          rows: [
            ['Property Address', ''],
            ['Purchase Price', '$'],
            ['After Repair Value (ARV)', '$'],
            ['Total Rehab Budget', '$'],
            ['Estimated Timeline', '          months'],
          ]
        }
      },
      {
        heading: 'Acquisition Costs',
        table: {
          headers: ['Item', 'Amount'],
          rows: [
            ['Purchase Price', '$'],
            ['Closing Costs', '$'],
            ['Inspection Fees', '$'],
            ['Title Insurance', '$'],
            ['Attorney/Escrow Fees', '$'],
            ['Total Acquisition', '$'],
          ]
        }
      },
      {
        heading: 'Holding Costs (Monthly)',
        table: {
          headers: ['Item', 'Monthly', '×', 'Months', '=', 'Total'],
          rows: [
            ['Loan Payment', '$', '×', '', '=', '$'],
            ['Property Taxes', '$', '×', '', '=', '$'],
            ['Insurance', '$', '×', '', '=', '$'],
            ['Utilities', '$', '×', '', '=', '$'],
            ['HOA (if applicable)', '$', '×', '', '=', '$'],
            ['Total Holding Costs', '', '', '', '', '$'],
          ]
        }
      },
      {
        heading: 'Selling Costs',
        table: {
          headers: ['Item', 'Amount'],
          rows: [
            ['Agent Commission (5-6%)', '$'],
            ['Closing Costs', '$'],
            ['Staging', '$'],
            ['Buyer Concessions', '$'],
            ['Total Selling Costs', '$'],
          ]
        }
      },
      {
        heading: 'Profit Analysis',
        table: {
          headers: ['Metric', 'Amount'],
          rows: [
            ['After Repair Value (ARV)', '$'],
            ['Less: Total Acquisition', '- $'],
            ['Less: Rehab Costs', '- $'],
            ['Less: Holding Costs', '- $'],
            ['Less: Selling Costs', '- $'],
            ['NET PROFIT', '$'],
            ['Return on Investment (ROI)', '%'],
          ]
        }
      },
      {
        heading: '70% Rule Quick Check',
        table: {
          headers: ['Calculation', 'Amount'],
          rows: [
            ['ARV', '$'],
            ['× 70%', '$'],
            ['- Rehab Costs', '- $'],
            ['= Maximum Offer', '$'],
            ['Your Offer', '$'],
            ['Meets 70% Rule?', '☐ Yes  ☐ No'],
          ]
        }
      },
    ]
  },
  'les_lt_rental_analyzer': {
    title: 'Rental Property Analyzer',
    subtitle: 'Calculate Cash Flow & Returns',
    sections: [
      {
        heading: 'Property Details',
        table: {
          headers: ['Field', 'Value'],
          rows: [
            ['Property Address', ''],
            ['Property Type', '☐ SFH  ☐ Duplex  ☐ Triplex  ☐ Quad'],
            ['Purchase Price', '$'],
            ['Beds / Baths', '          /          '],
            ['Square Footage', ''],
          ]
        }
      },
      {
        heading: 'Financing',
        table: {
          headers: ['Item', 'Value'],
          rows: [
            ['Purchase Price', '$'],
            ['Down Payment (          %)', '$'],
            ['Loan Amount', '$'],
            ['Interest Rate', '%'],
            ['Loan Term', '          years'],
            ['Monthly P&I Payment', '$'],
          ]
        }
      },
      {
        heading: 'Monthly Income',
        table: {
          headers: ['Source', 'Amount'],
          rows: [
            ['Gross Monthly Rent', '$'],
            ['Other Income', '$'],
            ['Total Gross Income', '$'],
          ]
        }
      },
      {
        heading: 'Monthly Expenses',
        table: {
          headers: ['Expense', 'Amount', '% of Rent'],
          rows: [
            ['Mortgage (P&I)', '$', ''],
            ['Property Taxes', '$', ''],
            ['Insurance', '$', ''],
            ['Vacancy Reserve', '$', '8%'],
            ['Property Management', '$', '10%'],
            ['Maintenance', '$', '5%'],
            ['CapEx Reserve', '$', '5%'],
            ['Utilities (if owner-paid)', '$', ''],
            ['HOA', '$', ''],
            ['Total Monthly Expenses', '$', ''],
          ]
        }
      },
      {
        heading: 'Cash Flow Summary',
        table: {
          headers: ['Metric', 'Amount'],
          rows: [
            ['Gross Monthly Income', '$'],
            ['Total Monthly Expenses', '- $'],
            ['Monthly Cash Flow', '$'],
            ['Annual Cash Flow', '$'],
          ]
        }
      },
      {
        heading: 'Return Metrics',
        table: {
          headers: ['Metric', 'Value', 'Target'],
          rows: [
            ['Cash-on-Cash Return', '%', '8-12%'],
            ['Cap Rate', '%', '5-10%'],
            ['1% Rule Test', '%', '≥ 1%'],
            ['DSCR', '', '> 1.25'],
          ]
        }
      },
    ]
  },
  'les_lt_noi_caprate': {
    title: 'NOI & Cap Rate Calculator',
    subtitle: 'Essential Metrics for Commercial Properties',
    sections: [
      {
        heading: 'Understanding NOI',
        content: [
          'Net Operating Income (NOI) = Effective Gross Income - Operating Expenses',
          '• NOI does NOT include debt service (mortgage payments)',
          '• NOI does NOT include capital expenditures',
          '• NOI is used to determine property value and compare investments',
        ]
      },
      {
        heading: 'Income Calculation',
        table: {
          headers: ['Item', 'Annual Amount'],
          rows: [
            ['Gross Potential Rent', '$'],
            ['- Vacancy Loss (          %)', '- $'],
            ['- Credit Loss', '- $'],
            ['+ Other Income', '+ $'],
            ['= Effective Gross Income', '$'],
          ]
        }
      },
      {
        heading: 'Operating Expenses',
        table: {
          headers: ['Expense Category', 'Annual Amount'],
          rows: [
            ['Property Taxes', '$'],
            ['Insurance', '$'],
            ['Utilities (owner-paid)', '$'],
            ['Property Management', '$'],
            ['Repairs & Maintenance', '$'],
            ['Landscaping/Snow', '$'],
            ['Legal/Accounting', '$'],
            ['Advertising', '$'],
            ['Reserves', '$'],
            ['Other', '$'],
            ['Total Operating Expenses', '$'],
          ]
        }
      },
      {
        heading: 'NOI Calculation',
        table: {
          headers: ['Item', 'Amount'],
          rows: [
            ['Effective Gross Income', '$'],
            ['- Total Operating Expenses', '- $'],
            ['= Net Operating Income (NOI)', '$'],
          ]
        }
      },
      {
        heading: 'Cap Rate Analysis',
        content: [
          'Cap Rate = NOI ÷ Property Value × 100',
          'Property Value = NOI ÷ Cap Rate',
        ]
      },
      {
        heading: 'Value at Different Cap Rates',
        table: {
          headers: ['If NOI is $', 'At 5% Cap', 'At 6% Cap', 'At 7% Cap', 'At 8% Cap'],
          rows: [
            ['$50,000', '$1,000,000', '$833,333', '$714,286', '$625,000'],
            ['$75,000', '$1,500,000', '$1,250,000', '$1,071,429', '$937,500'],
            ['$100,000', '$2,000,000', '$1,666,667', '$1,428,571', '$1,250,000'],
            ['Your NOI: $', '$', '$', '$', '$'],
          ]
        }
      },
    ]
  },
  'les_lt_sample_t12': {
    title: 'Sample T12 Analysis',
    subtitle: 'How to Read Trailing 12-Month Statements',
    sections: [
      {
        heading: 'What is a T12?',
        content: [
          'A T12 (Trailing 12-Month Statement) shows actual income and expenses for the past 12 months.',
          '• Use it to verify seller claims about income',
          '• Look for trends and seasonality',
          '• Identify expense irregularities',
          '• Calculate true NOI for your offer',
        ]
      },
      {
        heading: 'Monthly Income Tracker',
        table: {
          headers: ['Month', 'Gross Rent', 'Vacancy', 'Other', 'Effective Income'],
          rows: [
            ['January', '$', '$', '$', '$'],
            ['February', '$', '$', '$', '$'],
            ['March', '$', '$', '$', '$'],
            ['April', '$', '$', '$', '$'],
            ['May', '$', '$', '$', '$'],
            ['June', '$', '$', '$', '$'],
            ['July', '$', '$', '$', '$'],
            ['August', '$', '$', '$', '$'],
            ['September', '$', '$', '$', '$'],
            ['October', '$', '$', '$', '$'],
            ['November', '$', '$', '$', '$'],
            ['December', '$', '$', '$', '$'],
            ['ANNUAL TOTAL', '$', '$', '$', '$'],
          ]
        }
      },
      {
        heading: 'T12 Red Flags to Watch For',
        checklist: [
          'Unusually low vacancy (verify with rent roll)',
          'Missing or low management fee (add 8-10% if self-managed)',
          'Very low repair expenses (deferred maintenance?)',
          'One-time income items that won\'t repeat',
          'Personal expenses mixed with property expenses',
          'Property taxes don\'t match county records',
        ]
      },
      {
        heading: 'Common T12 Adjustments',
        table: {
          headers: ['Item', 'Seller Shows', 'Your Adjustment', 'Adjusted Amount'],
          rows: [
            ['Management', '$0', 'Add 8-10%', '$'],
            ['Vacancy', '2%', 'Use 5-8%', '$'],
            ['Repairs', 'Low', 'Use 5-10%', '$'],
            ['Reserves', '$0', 'Add 5%', '$'],
          ]
        }
      },
    ]
  },
  'les_lt_creative_finance': {
    title: 'Creative Finance Cheat Sheet',
    subtitle: 'Alternative Financing Strategies',
    sections: [
      {
        heading: 'Subject-To Financing',
        table: {
          headers: ['Aspect', 'Details'],
          rows: [
            ['What It Is', 'Taking over existing mortgage payments without formally assuming the loan'],
            ['How It Works', 'Seller deeds property to you; loan stays in seller\'s name'],
            ['Best For', 'Sellers behind on payments who need quick exit'],
            ['Key Risk', 'Due-on-sale clause (lender could call loan due)'],
            ['Typical Terms', 'Little to no money down; take over existing payment'],
          ]
        }
      },
      {
        heading: 'Seller Financing',
        table: {
          headers: ['Aspect', 'Details'],
          rows: [
            ['What It Is', 'Seller acts as the bank and finances your purchase'],
            ['Best For', 'Properties owned free and clear; sellers wanting income stream'],
            ['Typical Down Payment', '10-20%'],
            ['Typical Interest Rate', '5-8%'],
            ['Typical Term', '5-30 years with 3-7 year balloon'],
          ]
        }
      },
      {
        heading: 'Lease Options',
        table: {
          headers: ['Component', 'Typical Terms'],
          rows: [
            ['Option Fee', '1-5% of purchase price (often credited at close)'],
            ['Monthly Rent', 'At or above market rate'],
            ['Rent Credit', 'Portion of rent applied toward purchase'],
            ['Option Period', '1-3 years'],
            ['Strike Price', 'Locked in at contract signing'],
          ]
        }
      },
      {
        heading: 'DSCR Loans',
        table: {
          headers: ['Aspect', 'Details'],
          rows: [
            ['What It Is', 'Loan qualifies based on property income, not personal income'],
            ['Min DSCR', '1.0 - 1.25 (varies by lender)'],
            ['Down Payment', '20-25%'],
            ['Credit Score', '660-680+ typically'],
            ['Best For', 'Self-employed investors; scaling portfolios'],
          ]
        }
      },
      {
        heading: 'Hard Money vs Private Money',
        table: {
          headers: ['Factor', 'Hard Money', 'Private Money'],
          rows: [
            ['Source', 'Professional lending companies', 'Individual investors'],
            ['Interest Rate', '10-15%', 'Negotiable (often 8-12%)'],
            ['Points', '2-4 points', 'Negotiable'],
            ['Term', '6-18 months', 'Flexible'],
            ['Speed', 'Fast (1-2 weeks)', 'Very fast (days)'],
            ['Relationship', 'Transactional', 'Relationship-based'],
          ]
        }
      },
    ]
  },
  'les_lt_pm_pitch_deck': {
    title: 'Private Money Pitch Deck',
    subtitle: 'Present Opportunities to Private Lenders',
    sections: [
      {
        heading: 'The Opportunity',
        table: {
          headers: ['Detail', 'Information'],
          rows: [
            ['Property Address', ''],
            ['Purchase Price', '$'],
            ['After Repair Value', '$'],
            ['Loan Amount Requested', '$'],
            ['Loan-to-Value (LTV)', '%'],
            ['Project Timeline', '          months'],
          ]
        }
      },
      {
        heading: 'Your Track Record',
        table: {
          headers: ['Metric', 'Value'],
          rows: [
            ['Years in Real Estate', ''],
            ['Deals Completed', ''],
            ['Total Deal Volume', '$'],
            ['Average Project Profit', '$'],
            ['Investor Default History', 'None'],
          ]
        }
      },
      {
        heading: 'Proposed Loan Terms',
        table: {
          headers: ['Term', 'Details'],
          rows: [
            ['Loan Amount', '$'],
            ['Interest Rate', '          % annually'],
            ['Points', '          (          % of loan)'],
            ['Term Length', '          months'],
            ['Lien Position', '1st Position'],
            ['Payments', '☐ Monthly Interest  ☐ Accrued'],
          ]
        }
      },
      {
        heading: 'Investor Returns',
        table: {
          headers: ['Item', 'Amount'],
          rows: [
            ['Total Interest Earned', '$'],
            ['Points Earned', '$'],
            ['Total Return', '$'],
            ['Annualized Return', '%'],
          ]
        }
      },
      {
        heading: 'How Your Investment is Protected',
        checklist: [
          'First position lien recorded on property',
          'Conservative LTV (          %) — property value exceeds loan',
          'Personal guarantee from borrower',
          'Hazard insurance with lender as loss payee',
          'Title insurance protecting lender\'s interest',
          'Professional property inspection completed',
        ]
      },
      {
        heading: 'Exit Strategy',
        table: {
          headers: ['Strategy', 'Details'],
          rows: [
            ['Primary Exit', 'Sale of renovated property'],
            ['Secondary Exit', 'Refinance with conventional lender'],
            ['Backup Exit', 'Sell to investor at wholesale price'],
            ['Expected Timeline', '          months'],
          ]
        }
      },
    ]
  },
  'les_lt_deal_summary': {
    title: 'Deal Summary Template',
    subtitle: 'One-Page Property Overview',
    sections: [
      {
        heading: 'Property Overview',
        table: {
          headers: ['Detail', 'Information'],
          rows: [
            ['Property Address', ''],
            ['Property Type', ''],
            ['Beds / Baths', '          /          '],
            ['Square Footage', ''],
            ['Lot Size', ''],
            ['Year Built', ''],
            ['Current Condition', '☐ Excellent  ☐ Good  ☐ Fair  ☐ Poor'],
          ]
        }
      },
      {
        heading: 'Financial Summary',
        table: {
          headers: ['Item', 'Amount'],
          rows: [
            ['Asking/List Price', '$'],
            ['Your Offer Price', '$'],
            ['Estimated Repairs', '$'],
            ['Total Investment', '$'],
            ['After Repair Value (ARV)', '$'],
            ['Estimated Profit', '$'],
            ['ROI', '%'],
          ]
        }
      },
      {
        heading: 'Comparable Sales',
        table: {
          headers: ['Address', 'Bed/Bath', 'Sq Ft', 'Sale Price', 'Date'],
          rows: [
            ['', '', '', '$', ''],
            ['', '', '', '$', ''],
            ['', '', '', '$', ''],
          ]
        }
      },
      {
        heading: 'Exit Strategy',
        table: {
          headers: ['Strategy', 'Details'],
          rows: [
            ['Primary Exit', ''],
            ['Secondary Exit', ''],
            ['Timeline', '          months'],
          ]
        }
      },
      {
        heading: 'Investment Thesis',
        content: [
          'Why is this a good deal? (Write 2-3 sentences explaining the opportunity)',
          '',
          '',
        ]
      },
    ]
  },
  'les_lt_brrrr_sow': {
    title: 'BRRRR Scope of Work',
    subtitle: 'Plan Your BRRRR Project',
    sections: [
      {
        heading: 'BRRRR Numbers Overview',
        table: {
          headers: ['Metric', 'Target', 'Actual'],
          rows: [
            ['Purchase Price', '$', '$'],
            ['Rehab Budget', '$', '$'],
            ['All-In Cost', '$', '$'],
            ['After Repair Value (ARV)', '$', '$'],
            ['Target Rent', '$', '$'],
            ['Refinance Amount (75% LTV)', '$', '$'],
            ['Cash Left in Deal', '$', '$'],
          ]
        }
      },
      {
        heading: 'Goal: Leave Little to No Cash in the Deal',
        content: [
          'All-In Cost should be ≤ 75% of ARV to pull all cash out',
          'Formula: Purchase + Rehab + Closing ≤ ARV × 0.75',
        ]
      },
      {
        heading: 'Renovation Scope',
        table: {
          headers: ['Category', 'Items Needed', 'Budget'],
          rows: [
            ['Exterior', '', '$'],
            ['Roof', '', '$'],
            ['HVAC', '', '$'],
            ['Plumbing', '', '$'],
            ['Electrical', '', '$'],
            ['Kitchen', '', '$'],
            ['Bathrooms', '', '$'],
            ['Flooring', '', '$'],
            ['Paint', '', '$'],
            ['Other', '', '$'],
            ['Contingency (15%)', '', '$'],
            ['TOTAL REHAB', '', '$'],
          ]
        }
      },
      {
        heading: 'Project Timeline',
        table: {
          headers: ['Phase', 'Duration', 'Start', 'End'],
          rows: [
            ['Acquisition & Planning', '          days', '', ''],
            ['Demo', '          days', '', ''],
            ['Rough-In (MEP)', '          days', '', ''],
            ['Inspections', '          days', '', ''],
            ['Drywall & Paint', '          days', '', ''],
            ['Flooring & Trim', '          days', '', ''],
            ['Kitchen & Bath Finish', '          days', '', ''],
            ['Final Punch & Clean', '          days', '', ''],
            ['Tenant Placement', '          days', '', ''],
            ['Refinance', '          days', '', ''],
            ['TOTAL PROJECT', '          days', '', ''],
          ]
        }
      },
      {
        heading: 'Refinance Checklist',
        checklist: [
          'All renovations 100% complete',
          'Property rented with signed lease',
          'Tenant has paid first month\'s rent',
          'Seasoning period met (if required)',
          'Appraisal scheduled',
          'Lender documents submitted',
        ]
      },
    ]
  },
  'les_lt_tenant_screening': {
    title: 'Tenant Screening Criteria',
    subtitle: 'Fair & Consistent Qualification Standards',
    sections: [
      {
        heading: 'Fair Housing Reminder',
        content: [
          'Apply ALL criteria equally to EVERY applicant.',
          'Protected Classes: Race, Color, National Origin, Religion, Sex, Familial Status, Disability',
        ]
      },
      {
        heading: 'Income Requirements',
        table: {
          headers: ['Requirement', 'Standard'],
          rows: [
            ['Minimum Gross Monthly Income', '3× monthly rent'],
            ['Acceptable Verification', 'Pay stubs (2), tax returns (2 yrs), bank statements, employment letter'],
          ]
        }
      },
      {
        heading: 'Credit Score Standards',
        table: {
          headers: ['Credit Score', 'Decision'],
          rows: [
            ['700+', 'Approve'],
            ['650-699', 'Standard approval'],
            ['600-649', 'May require additional deposit or co-signer'],
            ['Below 600', 'Decline or require qualified co-signer'],
          ]
        }
      },
      {
        heading: 'Rental History Requirements',
        table: {
          headers: ['Factor', 'Standard'],
          rows: [
            ['Verifiable Rental History', '2 years minimum'],
            ['Landlord References', '2 required'],
            ['Eviction History', 'None in past 7 years'],
            ['Late Payments', 'No more than 2 in past 12 months'],
          ]
        }
      },
      {
        heading: 'Background Check Disqualifiers',
        checklist: [
          'Felony conviction within 7 years',
          'Drug-related offense within 5 years',
          'Violent crime',
          'Sex offender registry',
          'Prior evictions',
          'Outstanding judgments to previous landlords',
        ]
      },
      {
        heading: 'Landlord Reference Questions',
        numberedList: [
          'What were the lease start and end dates?',
          'What was the monthly rent amount?',
          'Was rent paid on time consistently?',
          'Were there any lease violations?',
          'Was proper notice given before move-out?',
          'What condition was the unit left in?',
          'Would you rent to this tenant again?',
        ]
      },
    ]
  },
  'les_lt_rental_app': {
    title: 'Rental Application',
    subtitle: 'Applicant Information Form',
    sections: [
      {
        heading: 'Property & Applicant',
        table: {
          headers: ['Field', 'Information'],
          rows: [
            ['Property Address', ''],
            ['Desired Move-In Date', ''],
            ['Monthly Rent', '$'],
            ['Applicant Full Legal Name', ''],
            ['Date of Birth', ''],
            ['Social Security Number', ''],
            ['Phone Number', ''],
            ['Email Address', ''],
            ['Driver\'s License #', ''],
            ['DL State', ''],
          ]
        }
      },
      {
        heading: 'Current Residence',
        table: {
          headers: ['Field', 'Information'],
          rows: [
            ['Current Address', ''],
            ['City, State, ZIP', ''],
            ['Monthly Rent/Mortgage', '$'],
            ['Move-In Date', ''],
            ['Reason for Moving', ''],
            ['Landlord/Mgmt Name', ''],
            ['Landlord Phone', ''],
          ]
        }
      },
      {
        heading: 'Employment Information',
        table: {
          headers: ['Field', 'Information'],
          rows: [
            ['Employer Name', ''],
            ['Employer Address', ''],
            ['Position/Title', ''],
            ['Supervisor Name', ''],
            ['Supervisor Phone', ''],
            ['Start Date', ''],
            ['Monthly Gross Income', '$'],
          ]
        }
      },
      {
        heading: 'Additional Occupants',
        table: {
          headers: ['Name', 'Relationship', 'Age'],
          rows: [
            ['', '', ''],
            ['', '', ''],
            ['', '', ''],
          ]
        }
      },
      {
        heading: 'Background Questions',
        checklist: [
          'Have you ever been evicted?',
          'Have you ever broken a lease?',
          'Have you filed for bankruptcy?',
          'Have you been convicted of a felony?',
        ]
      },
      {
        heading: 'Authorization',
        content: [
          'I authorize verification of all information and consent to credit, criminal, and eviction background checks.',
          '',
          'Applicant Signature: ______________________________  Date: ______________',
          '',
          'Application Fee: $________ (Non-refundable)',
        ]
      },
    ]
  },
  'les_lt_refi_checklist': {
    title: 'BRRRR Refinance Checklist',
    subtitle: 'Prepare for a Smooth Refinance',
    sections: [
      {
        heading: 'Property Readiness',
        checklist: [
          'All renovations 100% complete',
          'Property cleaned and staged for appraisal',
          'All permits closed out',
          'Certificate of Occupancy obtained (if required)',
          'Before/after photos documented',
          'All receipts and invoices organized',
        ]
      },
      {
        heading: 'Tenant Status (if BRRRR)',
        checklist: [
          'Qualified tenant in place',
          'Lease signed (12+ months preferred)',
          'First month rent collected',
          'Security deposit collected',
          'Rent at or above market rate',
        ]
      },
      {
        heading: 'Required Documentation',
        table: {
          headers: ['Document', 'Gathered?'],
          rows: [
            ['Personal tax returns (2 years)', '☐'],
            ['Business tax returns (2 years, if applicable)', '☐'],
            ['W-2s or 1099s', '☐'],
            ['Bank statements (2-3 months)', '☐'],
            ['Current mortgage/loan statement', '☐'],
            ['Insurance declaration page', '☐'],
            ['Signed lease agreement', '☐'],
            ['Purchase settlement statement (HUD)', '☐'],
            ['Renovation receipts/invoices', '☐'],
            ['Government-issued ID', '☐'],
          ]
        }
      },
      {
        heading: 'Lender Comparison',
        table: {
          headers: ['Factor', 'Lender 1', 'Lender 2', 'Lender 3'],
          rows: [
            ['Lender Name', '', '', ''],
            ['Interest Rate', '%', '%', '%'],
            ['LTV', '%', '%', '%'],
            ['Seasoning Required', '', '', ''],
            ['Closing Costs', '$', '$', '$'],
            ['Cash Out Amount', '$', '$', '$'],
          ]
        }
      },
      {
        heading: 'Cash-Out Calculation',
        table: {
          headers: ['Item', 'Amount'],
          rows: [
            ['Appraised Value', '$'],
            ['× LTV (          %)', ''],
            ['= Maximum Loan Amount', '$'],
            ['- Current Loan Payoff', '- $'],
            ['- Closing Costs', '- $'],
            ['= Cash to You', '$'],
          ]
        }
      },
      {
        heading: 'Appraisal Preparation',
        checklist: [
          'Deep clean entire property',
          'All lights working',
          'Yard maintained',
          'Prepare list of comparable sales for appraiser',
          'Prepare renovation summary for appraiser',
          'Ensure easy access to property',
        ]
      },
    ]
  },
  'les_lt_maintenance_form': {
    title: 'Maintenance Request Form',
    subtitle: 'Standardized Tenant Request Tracking',
    sections: [
      {
        heading: 'Request Information',
        table: {
          headers: ['Field', 'Information'],
          rows: [
            ['Date Submitted', ''],
            ['Property Address', ''],
            ['Unit Number', ''],
            ['Tenant Name', ''],
            ['Tenant Phone', ''],
            ['Tenant Email', ''],
          ]
        }
      },
      {
        heading: 'Issue Category',
        content: [
          '☐ Plumbing     ☐ Electrical     ☐ HVAC/Heating/Cooling',
          '☐ Appliance    ☐ Structural     ☐ Pest Control',
          '☐ Exterior     ☐ Safety         ☐ Other: ______________',
        ]
      },
      {
        heading: 'Location in Unit',
        content: [
          '☐ Kitchen      ☐ Bathroom       ☐ Bedroom',
          '☐ Living Room  ☐ Garage         ☐ Exterior',
          '☐ Other: ______________',
        ]
      },
      {
        heading: 'Problem Description',
        content: [
          'Describe the issue in detail:',
          '',
          '',
          '',
          'When did you first notice this issue? ______________',
          'Is this a recurring problem?  ☐ Yes  ☐ No',
        ]
      },
      {
        heading: 'Urgency Level',
        table: {
          headers: ['Level', 'Description', 'Response Time'],
          rows: [
            ['☐ EMERGENCY', 'Immediate health/safety risk', 'Within 2 hours'],
            ['☐ URGENT', 'Significant impact on habitability', 'Within 24 hours'],
            ['☐ ROUTINE', 'Standard maintenance needed', '3-5 business days'],
            ['☐ LOW', 'Minor/cosmetic issues', '7-14 days'],
          ]
        }
      },
      {
        heading: 'Access Permission',
        content: [
          'May we enter if you are not home?  ☐ Yes  ☐ No  ☐ Call First',
          '',
          'Best times for service:  ☐ Morning  ☐ Afternoon  ☐ Evening',
          '',
          'Pet in unit?  ☐ Yes  ☐ No     Type: ______________',
        ]
      },
      {
        heading: 'Office Use Only',
        table: {
          headers: ['Field', 'Information'],
          rows: [
            ['Request Number', ''],
            ['Date Received', ''],
            ['Assigned To', ''],
            ['Scheduled Date/Time', ''],
            ['Date Completed', ''],
            ['Work Performed', ''],
            ['Total Cost', '$'],
          ]
        }
      },
    ]
  },
  'les_lt_vendor_list': {
    title: 'Vendor & Contractor List',
    subtitle: 'Build Your Power Team',
    sections: [
      {
        heading: 'General Contractors',
        table: {
          headers: ['Company', 'Contact', 'Phone', 'Email', 'Rating'],
          rows: [
            ['', '', '', '', '☆☆☆☆☆'],
            ['', '', '', '', '☆☆☆☆☆'],
          ]
        }
      },
      {
        heading: 'Trade Specialists',
        table: {
          headers: ['Trade', 'Company', 'Contact', 'Phone', 'Rate'],
          rows: [
            ['Plumber', '', '', '', '$'],
            ['Electrician', '', '', '', '$'],
            ['HVAC', '', '', '', '$'],
            ['Roofer', '', '', '', ''],
            ['Painter', '', '', '', '$/sq ft'],
            ['Flooring', '', '', '', '$/sq ft'],
            ['Handyman', '', '', '', '$/hr'],
          ]
        }
      },
      {
        heading: 'Property Services',
        table: {
          headers: ['Service', 'Company', 'Contact', 'Phone', 'Rate'],
          rows: [
            ['Landscaping', '', '', '', '$/mo'],
            ['Cleaning', '', '', '', '$/clean'],
            ['Pest Control', '', '', '', '$/visit'],
            ['Appliance Repair', '', '', '', ''],
          ]
        }
      },
      {
        heading: 'Professional Services',
        table: {
          headers: ['Role', 'Name', 'Company', 'Phone', 'Email'],
          rows: [
            ['Real Estate Attorney', '', '', '', ''],
            ['CPA/Accountant', '', '', '', ''],
            ['Insurance Agent', '', '', '', ''],
            ['Property Manager', '', '', '', ''],
          ]
        }
      },
      {
        heading: 'Emergency Contacts',
        table: {
          headers: ['Emergency Type', 'Company', 'Phone (24/7)'],
          rows: [
            ['Plumbing', '', ''],
            ['Electrical', '', ''],
            ['Locksmith', '', ''],
            ['Water Damage', '', ''],
          ]
        }
      },
      {
        heading: 'Vendor Vetting Checklist',
        checklist: [
          'License verified (if required)',
          'Insurance certificate obtained',
          'References checked (2-3)',
          'Online reviews researched',
          'Written estimate received',
        ]
      },
    ]
  },
  'les_lt_house_rules': {
    title: 'House Rules Addendum',
    subtitle: 'Clear Expectations for Tenants',
    sections: [
      {
        heading: 'Document Header',
        content: [
          'Property Address: ________________________________',
          'Tenant Name(s): ________________________________',
          'Lease Date: ________________________________',
          '',
          'This addendum is attached to and made part of the Lease Agreement.',
        ]
      },
      {
        heading: 'General Conduct',
        numberedList: [
          'Quiet hours are 10:00 PM to 8:00 AM. Excessive noise is prohibited at all times.',
          'No personal belongings in hallways, stairways, or common areas.',
          'Any illegal activity is grounds for immediate lease termination.',
          'Smoking prohibited inside and within 25 feet of building (includes vaping).',
          'Guests staying 7+ consecutive days or 14+ days/month require management approval.',
        ]
      },
      {
        heading: 'Property Care',
        numberedList: [
          'Maintain unit in clean and sanitary condition.',
          'Place all trash in designated containers only.',
          'Do not pour grease or food waste down drains.',
          'Only flush human waste and toilet paper.',
          'No wall holes larger than picture hangers without written approval.',
        ]
      },
      {
        heading: 'Appliances & Systems',
        numberedList: [
          'Replace HVAC filters monthly.',
          'Report appliance malfunctions immediately.',
          'Maintain minimum 55°F heat in winter to prevent frozen pipes.',
          'Never disable or remove batteries from smoke/CO detectors.',
        ]
      },
      {
        heading: 'Parking & Vehicles',
        numberedList: [
          'Park only in assigned spaces.',
          'All vehicles must be operable, registered, and insured.',
          'No vehicle repairs in parking areas.',
          'RVs, boats, and commercial vehicles require written approval.',
        ]
      },
      {
        heading: 'Acknowledgment',
        content: [
          'By signing below, I acknowledge receipt and agree to these house rules.',
          '',
          'Tenant Signature: ______________________________  Date: ______________',
          '',
          'Tenant Signature: ______________________________  Date: ______________',
        ]
      },
    ]
  },
  'les_lt_lease_template': {
    title: 'Residential Lease Agreement',
    subtitle: 'Standard Lease Template',
    sections: [
      {
        heading: 'Parties',
        table: {
          headers: ['Party', 'Information'],
          rows: [
            ['Landlord Name', ''],
            ['Landlord Address', ''],
            ['Landlord Phone', ''],
            ['Landlord Email', ''],
            ['Tenant Name(s)', ''],
          ]
        }
      },
      {
        heading: 'Property',
        table: {
          headers: ['Detail', 'Information'],
          rows: [
            ['Property Address', ''],
            ['City, State, ZIP', ''],
            ['Unit Number', ''],
            ['Includes', '☐ Garage  ☐ Storage  ☐ Parking Space #____'],
          ]
        }
      },
      {
        heading: 'Lease Term',
        table: {
          headers: ['Term', 'Date'],
          rows: [
            ['Lease Type', '☐ Fixed Term  ☐ Month-to-Month'],
            ['Start Date', ''],
            ['End Date', ''],
          ]
        }
      },
      {
        heading: 'Rent & Payments',
        table: {
          headers: ['Item', 'Amount/Date'],
          rows: [
            ['Monthly Rent', '$'],
            ['Due Date', '____ of each month'],
            ['Grace Period', '____ days'],
            ['Late Fee', '$'],
            ['Returned Payment Fee', '$'],
            ['Make Checks Payable To', ''],
            ['Payment Address', ''],
          ]
        }
      },
      {
        heading: 'Security Deposit',
        table: {
          headers: ['Deposit Type', 'Amount'],
          rows: [
            ['Security Deposit', '$'],
            ['Pet Deposit', '$'],
            ['Other', '$'],
            ['Total Deposits', '$'],
          ]
        }
      },
      {
        heading: 'Utilities',
        content: [
          'Tenant Pays: ☐ Electric  ☐ Gas  ☐ Water  ☐ Trash  ☐ Internet  ☐ Cable',
          'Landlord Pays: ☐ Electric  ☐ Gas  ☐ Water  ☐ Trash  ☐ Internet  ☐ Cable',
        ]
      },
      {
        heading: 'Signatures',
        content: [
          '',
          'TENANT:',
          'Signature: ______________________________  Date: ______________',
          'Print Name: ______________________________',
          '',
          'LANDLORD:',
          'Signature: ______________________________  Date: ______________',
          'Print Name: ______________________________',
        ]
      },
    ]
  },
  'les_lt_contractor_checklist': {
    title: 'Contractor Agreement Checklist',
    subtitle: 'Protect Yourself Before Any Project',
    sections: [
      {
        heading: 'Before Signing: Verify Credentials',
        table: {
          headers: ['Item', 'Status', 'Details'],
          rows: [
            ['License Verified', '☐ Yes ☐ No', 'License #:'],
            ['Insurance Certificate', '☐ Yes ☐ No', 'Expires:'],
            ['Workers Comp', '☐ Yes ☐ No ☐ N/A', ''],
            ['References Checked', '☐ Yes ☐ No', ''],
            ['Online Reviews', '☐ Yes ☐ No', 'Rating:'],
          ]
        }
      },
      {
        heading: 'Contract Must Include',
        checklist: [
          'Contractor\'s legal business name and license number',
          'Detailed scope of work (everything included AND excluded)',
          'Specific materials (brand, model, color)',
          'Total contract price',
          'Payment schedule with milestones',
          'Start date and completion date',
          'Change order process and pricing',
          'Warranty terms (labor and materials)',
          'Permit responsibilities',
          'Insurance requirements',
        ]
      },
      {
        heading: 'Recommended Payment Schedule',
        table: {
          headers: ['Milestone', 'Percentage', 'Amount'],
          rows: [
            ['Contract Signing', '10-20%', '$'],
            ['Materials Delivered', '20-30%', '$'],
            ['Rough-In Complete', '20-25%', '$'],
            ['Substantial Completion', '20-25%', '$'],
            ['Final Walkthrough', '10%', '$'],
            ['TOTAL', '100%', '$'],
          ]
        }
      },
      {
        heading: 'Red Flags — Do Not Sign If',
        checklist: [
          'Contractor wants cash only',
          'Demands large upfront payment (>33%)',
          'Cannot provide insurance certificate',
          'License cannot be verified',
          'No written contract offered',
          'Scope of work is vague',
          'Pressures you to sign immediately',
        ]
      },
      {
        heading: 'During the Project',
        checklist: [
          'Document progress with dated photos',
          'Get lien waivers with each payment',
          'Verify permit inspections passed',
          'Document ALL changes in writing (signed)',
          'Keep all receipts and invoices',
        ]
      },
      {
        heading: 'Project Completion',
        checklist: [
          'Final walkthrough completed',
          'Punch list items addressed',
          'All permits signed off',
          'Final lien waiver received',
          'Warranty documentation received',
          'Final payment made',
        ]
      },
    ]
  },
  'les_lt_flip_timeline': {
    title: 'Fix & Flip Timeline',
    subtitle: 'Project Management Template',
    sections: [
      {
        heading: 'Project Overview',
        table: {
          headers: ['Field', 'Target', 'Actual'],
          rows: [
            ['Property Address', '', ''],
            ['Purchase Date', '', ''],
            ['Target List Date', '', ''],
            ['Target Close Date', '', ''],
            ['Total Project Days', '', ''],
          ]
        }
      },
      {
        heading: 'Phase 1: Acquisition (Week 1-2)',
        table: {
          headers: ['Task', 'Target Date', 'Actual', 'Status'],
          rows: [
            ['Offer Accepted', '', '', '☐'],
            ['Inspections Complete', '', '', '☐'],
            ['Financing Secured', '', '', '☐'],
            ['Insurance Bound', '', '', '☐'],
            ['Closing Complete', '', '', '☐'],
            ['Keys Received', '', '', '☐'],
          ]
        }
      },
      {
        heading: 'Phase 2: Pre-Construction (Week 2-3)',
        table: {
          headers: ['Task', 'Target Date', 'Actual', 'Status'],
          rows: [
            ['Scope Finalized', '', '', '☐'],
            ['Contractor Bids Received', '', '', '☐'],
            ['Contract Signed', '', '', '☐'],
            ['Permits Applied', '', '', '☐'],
            ['Materials Ordered', '', '', '☐'],
            ['Permits Approved', '', '', '☐'],
          ]
        }
      },
      {
        heading: 'Phase 3: Construction (Week 3-8)',
        table: {
          headers: ['Task', 'Target Date', 'Actual', 'Status'],
          rows: [
            ['Demo Complete', '', '', '☐'],
            ['Rough Electrical', '', '', '☐'],
            ['Rough Plumbing', '', '', '☐'],
            ['Rough HVAC', '', '', '☐'],
            ['Rough Inspection', '', '', '☐'],
            ['Drywall Complete', '', '', '☐'],
            ['Paint Complete', '', '', '☐'],
            ['Flooring Complete', '', '', '☐'],
            ['Cabinets/Counters', '', '', '☐'],
            ['Fixtures Installed', '', '', '☐'],
            ['Final Inspection', '', '', '☐'],
          ]
        }
      },
      {
        heading: 'Phase 4: Sale (Week 8-14)',
        table: {
          headers: ['Task', 'Target Date', 'Actual', 'Status'],
          rows: [
            ['Deep Clean', '', '', '☐'],
            ['Photos Taken', '', '', '☐'],
            ['Staging Complete', '', '', '☐'],
            ['Listed on MLS', '', '', '☐'],
            ['Offer Received', '', '', '☐'],
            ['Offer Accepted', '', '', '☐'],
            ['Appraisal Complete', '', '', '☐'],
            ['Clear to Close', '', '', '☐'],
            ['Closing Complete', '', '', '☐'],
          ]
        }
      },
      {
        heading: 'Budget Tracking',
        table: {
          headers: ['Category', 'Budget', 'Actual', 'Variance'],
          rows: [
            ['Purchase', '$', '$', '$'],
            ['Closing (buy)', '$', '$', '$'],
            ['Rehab', '$', '$', '$'],
            ['Holding', '$', '$', '$'],
            ['Selling', '$', '$', '$'],
            ['TOTAL COSTS', '$', '$', '$'],
            ['Sale Price', '$', '$', '$'],
            ['NET PROFIT', '$', '$', '$'],
          ]
        }
      },
    ]
  },
  'les_lt_cash_buyer_list': {
    title: 'Cash Buyer List',
    subtitle: 'Build Your Buyer Network',
    sections: [
      {
        heading: 'Where to Find Cash Buyers',
        table: {
          headers: ['Source', 'Method'],
          rows: [
            ['Public Records', 'Search county recorder for recent cash transactions'],
            ['Title Companies', 'Ask for cash buyer lists'],
            ['REIA Meetings', 'Network with local investors'],
            ['Facebook Groups', 'Join real estate investor groups'],
            ['BiggerPockets', 'Connect with active investors'],
            ['Bandit Signs', 'Callers are often investors'],
            ['Landlord Associations', 'Landlords buy rentals'],
          ]
        }
      },
      {
        heading: 'Cash Buyer Database',
        table: {
          headers: ['Name', 'Phone', 'Email', 'Buying Criteria'],
          rows: [
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
          ]
        }
      },
      {
        heading: 'Buyer Qualification Form',
        table: {
          headers: ['Question', 'Answer'],
          rows: [
            ['Property Types', '☐ SFH  ☐ Multi  ☐ Commercial'],
            ['Target Areas', ''],
            ['Price Range', '$          to $'],
            ['Condition', '☐ Turnkey  ☐ Light Rehab  ☐ Heavy'],
            ['Strategy', '☐ Flip  ☐ BRRRR  ☐ Rental'],
            ['Deals Per Month', ''],
            ['Can Close In', '          days'],
            ['Proof of Funds', '☐ Verified  ☐ Pending'],
          ]
        }
      },
      {
        heading: 'Buyer Segmentation',
        table: {
          headers: ['Tier', 'Criteria', 'Your Buyers'],
          rows: [
            ['A-List (Priority)', 'Close in 14 days, POF verified, repeat buyer', ''],
            ['B-List (Standard)', 'Close in 21 days, responsive, verified', ''],
            ['C-List (Nurture)', 'Slower closings, new/unverified', ''],
          ]
        }
      },
    ]
  },
  'les_lt_seller_script': {
    title: 'Seller Call Script',
    subtitle: 'Build Rapport & Identify Motivated Sellers',
    sections: [
      {
        heading: 'Opening',
        content: [
          '"Hi, is this [Name]?"',
          '"Great! My name is [Your Name] and I\'m calling about your property at [Address]."',
          '"Did I catch you at a good time?"',
          '',
          'If NO: "No problem, when would be a better time to chat for about 10 minutes?"',
        ]
      },
      {
        heading: 'Build Rapport',
        content: [
          '"Before we dive in, tell me a little about the property. How long have you owned it?"',
          '',
          '[Listen and respond naturally]',
          '',
          '"That\'s great. What made you decide to consider selling at this point?"',
          '',
          '[This reveals motivation — the key to every deal]',
        ]
      },
      {
        heading: 'Discovery Questions',
        numberedList: [
          'Tell me about the property — how many bedrooms and bathrooms?',
          'What\'s the approximate square footage?',
          'What condition would you say it\'s in?',
          'Is anyone currently living there?',
          'What\'s prompting you to sell right now?',
          'What happens if you don\'t sell?',
          'Have you tried listing with an agent? How did that go?',
          'Is there a timeline you\'re working with?',
          'Do you have a mortgage on the property? About how much do you owe?',
          'What were you hoping to get for the property?',
        ]
      },
      {
        heading: 'Transition to Appointment',
        content: [
          '"It sounds like we might be able to help each other."',
          '"I\'d love to take a look at the property and give you a fair offer."',
          '"Would [tomorrow at TIME] or [DAY at TIME] work better for you?"',
          '',
          'Confirm: Date, Time, Address, Phone number, Who will be there',
        ]
      },
      {
        heading: 'Call Notes Template',
        table: {
          headers: ['Field', 'Notes'],
          rows: [
            ['Property Address', ''],
            ['Seller Name', ''],
            ['Motivation (1-10)', ''],
            ['Timeline', ''],
            ['Asking Price', '$'],
            ['Mortgage Balance', '$'],
            ['Condition', ''],
            ['Follow-Up Date', ''],
            ['Next Steps', ''],
          ]
        }
      },
    ]
  },
  'les_lt_objection_handling': {
    title: 'Seller Objection Handling',
    subtitle: 'Turn Hesitation Into Contracts',
    sections: [
      {
        heading: 'Price Objections',
        table: {
          headers: ['Objection', 'Response'],
          rows: [
            ['"Your offer is too low."', '"I understand. Let me walk you through how I arrived at that number. After repairs and my costs, this is what works. What number did you have in mind?"'],
            ['"I can get more with an agent."', '"You might. The trade-off is 6% commission, 3-6 months on market, repairs, showings, and deals can still fall through. I offer certainty — guaranteed close in 2 weeks, no repairs, no commissions."'],
            ['"Zestimate says it\'s worth more."', '"Zestimate doesn\'t account for condition or needed repairs. I base offers on actual comparable sales. Would you like to see the comps?"'],
          ]
        }
      },
      {
        heading: 'Timing Objections',
        table: {
          headers: ['Objection', 'Response'],
          rows: [
            ['"I need to think about it."', '"Absolutely. What specifically would you like to think over? Maybe I can provide more clarity."'],
            ['"I\'m not ready yet."', '"No problem. When do you think you might be ready? I\'d love to stay in touch."'],
            ['"I want to get other offers."', '"That makes sense. How many offers are you hoping to get, and when do you plan to decide?"'],
          ]
        }
      },
      {
        heading: 'Trust Objections',
        table: {
          headers: ['Objection', 'Response'],
          rows: [
            ['"How do I know you\'re legitimate?"', '"Great question. I can provide references from sellers I\'ve worked with, my company information, and we use a reputable title company."'],
            ['"I\'ve never heard of selling this way."', '"It\'s simple — we buy directly, which means no listing, showings, repairs, or waiting. Fast, guaranteed close."'],
            ['"Are you going to flip my house?"', '"I might renovate, rent, or sell it. My profit comes from the work and risk. What matters to you is a fair price and hassle-free sale."'],
          ]
        }
      },
      {
        heading: 'Key Principles',
        numberedList: [
          'Listen first — understand before responding',
          'Acknowledge their concern — validate it',
          'Reframe — shift perspective to benefits',
          'Ask questions — dig deeper',
          'Stay calm — never argue',
          'Follow up — most deals close on follow-up',
        ]
      },
    ]
  },
  'les_lt_assignment_contract': {
    title: 'Assignment Contract Template',
    subtitle: 'Wholesale Transaction Document',
    sections: [
      {
        heading: 'Important Disclaimer',
        content: [
          'This is a template only. Laws vary by state.',
          'Always consult with a licensed real estate attorney.',
          'Ensure your original purchase contract allows assignment.',
        ]
      },
      {
        heading: 'Parties to the Assignment',
        table: {
          headers: ['Party', 'Information'],
          rows: [
            ['Assignor (You)', ''],
            ['Assignor Address', ''],
            ['Assignor Phone', ''],
            ['Assignee (Buyer)', ''],
            ['Assignee Address', ''],
            ['Assignee Phone', ''],
          ]
        }
      },
      {
        heading: 'Original Contract Details',
        table: {
          headers: ['Detail', 'Information'],
          rows: [
            ['Property Address', ''],
            ['Original Contract Date', ''],
            ['Seller Name', ''],
            ['Original Purchase Price', '$'],
            ['Original Closing Date', ''],
          ]
        }
      },
      {
        heading: 'Assignment Terms',
        table: {
          headers: ['Term', 'Amount/Detail'],
          rows: [
            ['Assignment Fee', '$'],
            ['Earnest Money from Assignee', '$'],
            ['EMD Due Upon Signing', '$'],
            ['Balance Due at Closing', '$'],
          ]
        }
      },
      {
        heading: 'Key Provisions',
        numberedList: [
          'Assignor assigns all rights and interest in the Original Contract to Assignee.',
          'Assignee assumes all obligations under the Original Contract.',
          'Assignee agrees to close on or before the scheduled closing date.',
          'Assignment Fee is due at closing through the title company.',
          'Assignor warrants the Original Contract is in full force and permits assignment.',
        ]
      },
      {
        heading: 'Signatures',
        content: [
          '',
          'ASSIGNOR:',
          'Signature: ______________________________  Date: ______________',
          'Print Name: ______________________________',
          '',
          'ASSIGNEE:',
          'Signature: ______________________________  Date: ______________',
          'Print Name: ______________________________',
        ]
      },
    ]
  },
  'les_lt_double_closing': {
    title: 'Double Closing Checklist',
    subtitle: 'Execute Back-to-Back Transactions',
    sections: [
      {
        heading: 'When to Use Double Close',
        content: [
          '• Large spread you want to keep private',
          '• Original contract prohibits assignment',
          '• Bank-owned (REO) property',
          '• Your buyer is using financing',
        ]
      },
      {
        heading: 'Title Company Requirements',
        checklist: [
          'Title company does double/simultaneous closes',
          'Allows transactional funding',
          'Both contracts submitted to title',
          'Separate HUDs for A-B and B-C transactions',
          'Same-day closing confirmed',
        ]
      },
      {
        heading: 'A-B Transaction (Your Purchase)',
        table: {
          headers: ['Item', 'Details'],
          rows: [
            ['Seller Name', ''],
            ['Property Address', ''],
            ['Purchase Price', '$'],
            ['EMD Deposit', '$'],
            ['Closing Date', ''],
            ['Funds Source', '☐ Transactional  ☐ Cash  ☐ End Buyer'],
          ]
        }
      },
      {
        heading: 'B-C Transaction (Your Sale)',
        table: {
          headers: ['Item', 'Details'],
          rows: [
            ['Buyer Name', ''],
            ['Sale Price', '$'],
            ['Buyer EMD', '$'],
            ['Closing Date', ''],
            ['Buyer Funding', '☐ Cash  ☐ Hard Money  ☐ Conventional'],
          ]
        }
      },
      {
        heading: 'Transactional Funding (If Needed)',
        table: {
          headers: ['Term', 'Details'],
          rows: [
            ['Lender', ''],
            ['Amount', '$'],
            ['Fee', '$'],
            ['Points', ''],
            ['Approved', '☐ Yes  ☐ No'],
          ]
        }
      },
      {
        heading: 'Profit Calculation',
        table: {
          headers: ['Item', 'Amount'],
          rows: [
            ['B-C Sale Price', '$'],
            ['A-B Purchase Price', '- $'],
            ['Gross Spread', '$'],
            ['A-B Closing Costs', '- $'],
            ['B-C Closing Costs', '- $'],
            ['Transactional Funding Fee', '- $'],
            ['NET PROFIT', '$'],
          ]
        }
      },
      {
        heading: 'Closing Day Schedule',
        table: {
          headers: ['Time', 'Activity', 'Complete'],
          rows: [
            ['', 'A-B closing begins', '☐'],
            ['', 'A-B documents signed', '☐'],
            ['', 'A-B funds disbursed', '☐'],
            ['', 'B-C closing begins', '☐'],
            ['', 'B-C documents signed', '☐'],
            ['', 'B-C funds disbursed', '☐'],
            ['', 'Your profit distributed', '☐'],
          ]
        }
      },
    ]
  },
  'les_lt_team_contacts': {
    title: 'Team Contact Sheet',
    subtitle: 'Your Real Estate Power Team',
    sections: [
      {
        heading: 'Real Estate Professionals',
        table: {
          headers: ['Role', 'Name', 'Company', 'Phone', 'Email'],
          rows: [
            ['Buyer\'s Agent', '', '', '', ''],
            ['Listing Agent', '', '', '', ''],
            ['Wholesaler Partner', '', '', '', ''],
            ['Property Manager', '', '', '', ''],
          ]
        }
      },
      {
        heading: 'Legal & Financial',
        table: {
          headers: ['Role', 'Name', 'Company', 'Phone', 'Email'],
          rows: [
            ['Real Estate Attorney', '', '', '', ''],
            ['CPA/Accountant', '', '', '', ''],
            ['Bookkeeper', '', '', '', ''],
            ['Title Company', '', '', '', ''],
          ]
        }
      },
      {
        heading: 'Lending Partners',
        table: {
          headers: ['Type', 'Contact', 'Company', 'Phone', 'Terms'],
          rows: [
            ['Conventional Lender', '', '', '', ''],
            ['Hard Money Lender', '', '', '', ''],
            ['DSCR Lender', '', '', '', ''],
            ['Private Lender #1', '', '', '', ''],
            ['Private Lender #2', '', '', '', ''],
          ]
        }
      },
      {
        heading: 'Contractors',
        table: {
          headers: ['Trade', 'Contact', 'Company', 'Phone'],
          rows: [
            ['General Contractor', '', '', ''],
            ['Plumber', '', '', ''],
            ['Electrician', '', '', ''],
            ['HVAC', '', '', ''],
            ['Roofer', '', '', ''],
            ['Handyman', '', '', ''],
          ]
        }
      },
      {
        heading: 'Insurance',
        table: {
          headers: ['Type', 'Agent', 'Company', 'Phone', 'Policy #'],
          rows: [
            ['Property Insurance', '', '', '', ''],
            ['Liability/Umbrella', '', '', '', ''],
            ['Builder\'s Risk', '', '', '', ''],
          ]
        }
      },
    ]
  },
  'les_lt_kpi_dashboard': {
    title: 'KPI Dashboard',
    subtitle: 'Track Your Business Metrics',
    sections: [
      {
        heading: 'Marketing KPIs',
        table: {
          headers: ['Metric', 'This Month', 'Last Month', 'Goal'],
          rows: [
            ['Total Leads', '', '', ''],
            ['Cost Per Lead', '$', '$', '$'],
            ['Marketing Spend', '$', '$', '$'],
            ['Direct Mail Leads', '', '', ''],
            ['PPC/Online Leads', '', '', ''],
            ['Referral Leads', '', '', ''],
          ]
        }
      },
      {
        heading: 'Sales KPIs',
        table: {
          headers: ['Metric', 'This Month', 'Last Month', 'Goal'],
          rows: [
            ['Leads Contacted', '', '', ''],
            ['Appointments Set', '', '', ''],
            ['Appointments Kept', '', '', ''],
            ['Offers Made', '', '', ''],
            ['Contracts Signed', '', '', ''],
            ['Deals Closed', '', '', ''],
          ]
        }
      },
      {
        heading: 'Conversion Rates',
        table: {
          headers: ['Conversion', 'Rate', 'Goal'],
          rows: [
            ['Lead → Appointment', '%', '%'],
            ['Appointment → Offer', '%', '%'],
            ['Offer → Contract', '%', '%'],
            ['Contract → Close', '%', '%'],
            ['Lead → Close', '%', '%'],
          ]
        }
      },
      {
        heading: 'Financial KPIs',
        table: {
          headers: ['Metric', 'This Month', 'YTD', 'Goal'],
          rows: [
            ['Gross Revenue', '$', '$', '$'],
            ['Total Expenses', '$', '$', '$'],
            ['Net Profit', '$', '$', '$'],
            ['Average Deal Profit', '$', '$', '$'],
            ['Cost Per Deal', '$', '$', '$'],
          ]
        }
      },
      {
        heading: 'Portfolio KPIs (Rentals)',
        table: {
          headers: ['Metric', 'Current', 'Goal'],
          rows: [
            ['Total Units', '', ''],
            ['Gross Monthly Rent', '$', '$'],
            ['Monthly Cash Flow', '$', '$'],
            ['Occupancy Rate', '%', '%'],
            ['Portfolio Value', '$', '$'],
          ]
        }
      },
    ]
  },
  'les_lt_action_plan': {
    title: '12-Month Action Plan',
    subtitle: 'Your Roadmap to Real Estate Success',
    sections: [
      {
        heading: 'Your Starting Point',
        table: {
          headers: ['Factor', 'Current Status'],
          rows: [
            ['Available Cash', '$'],
            ['Credit Score', ''],
            ['Current Income', '$'],
            ['Time Available/Week', '          hours'],
            ['Target Strategy', '☐ Wholesale  ☐ Flip  ☐ BRRRR  ☐ Rental'],
          ]
        }
      },
      {
        heading: 'Quarter 1: Foundation (Months 1-3)',
        table: {
          headers: ['Month', 'Focus', 'Key Actions'],
          rows: [
            ['Month 1', 'Education', 'Complete courses, read books, join REIA'],
            ['Month 2', 'Team Building', 'Find agent, lenders, title company'],
            ['Month 3', 'Market Mastery', 'Analyze 50+ deals, drive neighborhoods'],
          ]
        }
      },
      {
        heading: 'Quarter 2: Action (Months 4-6)',
        table: {
          headers: ['Month', 'Focus', 'Key Actions'],
          rows: [
            ['Month 4', 'Lead Generation', 'Launch marketing, generate leads'],
            ['Month 5', 'Deal Flow', 'Increase activity, refine process'],
            ['Month 6', 'First Deal', 'Close your first deal'],
          ]
        }
      },
      {
        heading: 'Quarter 3: Scale (Months 7-9)',
        table: {
          headers: ['Month', 'Focus', 'Key Actions'],
          rows: [
            ['Month 7', 'Systems', 'Document processes, set up CRM'],
            ['Month 8', 'Optimize', 'Cut underperformers, double down on winners'],
            ['Month 9', 'Expand', 'Increase budget, add lead sources'],
          ]
        }
      },
      {
        heading: 'Quarter 4: Momentum (Months 10-12)',
        table: {
          headers: ['Month', 'Focus', 'Key Actions'],
          rows: [
            ['Month 10', 'Leverage', 'Hire help, build partnerships'],
            ['Month 11', 'Diversify', 'Add exit strategies, explore markets'],
            ['Month 12', 'Review', 'Assess results, plan Year 2'],
          ]
        }
      },
      {
        heading: '12-Month Goals',
        table: {
          headers: ['Goal', 'Target', 'Actual'],
          rows: [
            ['Deals Closed', '', ''],
            ['Total Revenue', '$', '$'],
            ['Net Profit', '$', '$'],
            ['Properties Owned', '', ''],
            ['Monthly Cash Flow', '$', '$'],
          ]
        }
      },
    ]
  },
};

function createHeaderWithLogo(): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 150, height: 40 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
    ],
  });
}

function createFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: '© Maxxed Out University  |  ',
            size: 18,
            color: LIGHT_TEXT,
          }),
          new TextRun({
            text: 'Page ',
            size: 18,
            color: LIGHT_TEXT,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 18,
            color: LIGHT_TEXT,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });
}

function createTable(data: TableData): Table {
  const rows: TableRow[] = [];

  // Header row
  rows.push(
    new TableRow({
      tableHeader: true,
      children: data.headers.map((header) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: header,
                  bold: true,
                  color: 'FFFFFF',
                  size: 22,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
        })
      ),
    })
  );

  // Data rows
  data.rows.forEach((row, rowIndex) => {
    rows.push(
      new TableRow({
        children: row.map((cell, cellIndex) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell,
                    size: 20,
                    color: DARK_TEXT,
                  }),
                ],
                alignment: cellIndex === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
              }),
            ],
            shading: rowIndex % 2 === 1 ? { fill: TABLE_ALT_ROW, type: ShadingType.CLEAR } : undefined,
            verticalAlign: VerticalAlign.CENTER,
          })
        ),
      })
    );
  });

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  });
}

function createDocument(docContent: DocContent): Document {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: docContent.title,
          bold: true,
          size: 48,
          color: BRAND_BLUE,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Subtitle
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: docContent.subtitle,
          italics: true,
          size: 24,
          color: LIGHT_TEXT,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Divider line
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '━'.repeat(60),
          color: BRAND_GOLD,
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Sections
  for (const section of docContent.sections) {
    // Section heading
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.heading,
            bold: true,
            size: 28,
            color: BRAND_BLUE,
          }),
        ],
        spacing: { before: 300, after: 200 },
      })
    );

    // Content
    if (section.content) {
      for (const line of section.content) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 22,
                color: DARK_TEXT,
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }

    // Table
    if (section.table) {
      children.push(createTable(section.table));
      children.push(new Paragraph({ spacing: { after: 200 } }));
    }

    // Checklist
    if (section.checklist) {
      for (const item of section.checklist) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `☐  ${item}`,
                size: 22,
                color: DARK_TEXT,
              }),
            ],
            spacing: { after: 80 },
            indent: { left: convertInchesToTwip(0.25) },
          })
        );
      }
    }

    // Numbered list
    if (section.numberedList) {
      section.numberedList.forEach((item, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}.  ${item}`,
                size: 22,
                color: DARK_TEXT,
              }),
            ],
            spacing: { after: 80 },
            indent: { left: convertInchesToTwip(0.25) },
          })
        );
      });
    }
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(0.75),
            left: convertInchesToTwip(0.75),
            right: convertInchesToTwip(0.75),
          },
        },
      },
      headers: {
        default: createHeaderWithLogo(),
      },
      footers: {
        default: createFooter(),
      },
      children,
    }],
  });
}

async function main() {
  console.log('Generating professional .docx files...\n');

  const downloadDir = path.join(process.cwd(), 'public', 'downloads');

  for (const [lessonId, docContent] of Object.entries(courseDocuments)) {
    try {
      const filename = docContent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '.docx';
      const filepath = path.join(downloadDir, filename);
      const fileUrl = `/downloads/${filename}`;

      const doc = createDocument(docContent);
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filepath, buffer);
      const fileSize = buffer.length;

      console.log(`✓ ${docContent.title} (${Math.round(fileSize / 1024)}KB)`);

      // Update database
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
      if (!lesson) continue;

      const existingResource = await prisma.resource.findFirst({ where: { lessonId } });
      if (existingResource) {
        await prisma.resource.update({
          where: { id: existingResource.id },
          data: { title: `${docContent.title} (Download)`, fileUrl, fileType: 'docx', fileSize },
        });
      } else {
        await prisma.resource.create({
          data: { title: `${docContent.title} (Download)`, fileUrl, fileType: 'docx', fileSize, lessonId },
        });
      }
    } catch (error) {
      console.error(`✗ Error: ${lessonId}`, error);
    }
  }

  console.log('\n✓ All documents generated!');
  await prisma.$disconnect();
}

main().catch(console.error);
