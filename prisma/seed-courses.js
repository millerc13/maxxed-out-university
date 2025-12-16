const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All course offerings organized by tier
const courses = [
  // ============================================
  // LOW-TICKET OFFERS ($7 - $97)
  // ============================================
  {
    title: 'Real Estate Starter Blueprint',
    slug: 'real-estate-starter-blueprint',
    description: `Your complete digital starter kit to launch your real estate investing journey. This comprehensive blueprint takes you from confused beginner to confident action-taker with everything you need to get started TODAY.

Includes:
• Step-by-step "First Deal Roadmap"
• The 10 phrases every investor must know
• Offer calculator
• Checklist for evaluating any property

Perfect for: Complete beginners who want a clear path to their first deal.`,
    shortDesc: 'Your complete starter kit to launch your real estate investing journey.',
    price: 2700, // $27
    tier: 'low',
    order: 1,
    modules: [
      {
        title: 'Your First Deal Roadmap',
        order: 1,
        lessons: [
          { title: 'Welcome & How to Use This Blueprint', order: 1, isFree: true },
          { title: 'The First Deal Roadmap Overview', order: 2 },
          { title: '10 Phrases Every Investor Must Know', order: 3 },
          { title: 'Using the Offer Calculator', order: 4 },
          { title: 'Property Evaluation Checklist Walkthrough', order: 5 },
        ]
      },
      {
        title: 'Resources & Downloads',
        order: 2,
        lessons: [
          { title: 'Download Your Toolkit', order: 1 },
          { title: 'Next Steps & Action Plan', order: 2 },
        ]
      }
    ]
  },
  {
    title: 'Flip Calculator + Deal Analyzer Pack',
    slug: 'flip-calculator-deal-analyzer',
    description: `Professional-grade calculators and analysis tools used by experienced investors. Instantly analyze any deal with confidence using the same tools Todd uses to evaluate hundreds of properties.

Includes:
• Flip calculator (brand-aligned)
• Wholesale assignment calculator
• Rental cash-flow calculator
• ARV analysis template
• Repair cost cheat sheet

Perfect for: Investors who want pro-level tools to analyze deals quickly and accurately.`,
    shortDesc: 'Professional calculators and analysis tools to evaluate any deal.',
    price: 4700, // $47
    tier: 'low',
    order: 2,
    modules: [
      {
        title: 'Calculator Tutorials',
        order: 1,
        lessons: [
          { title: 'Flip Calculator Deep Dive', order: 1, isFree: true },
          { title: 'Wholesale Assignment Calculator', order: 2 },
          { title: 'Rental Cash-Flow Calculator', order: 3 },
          { title: 'ARV Analysis Template', order: 4 },
          { title: 'Repair Cost Estimating', order: 5 },
        ]
      },
      {
        title: 'Real Deal Examples',
        order: 2,
        lessons: [
          { title: 'Analyzing a Real Flip Deal', order: 1 },
          { title: 'Running Numbers on a Wholesale', order: 2 },
          { title: 'Evaluating a Rental Property', order: 3 },
        ]
      }
    ]
  },
  {
    title: 'Wholesaler Scripts, Templates & Contracts Vault',
    slug: 'wholesaler-scripts-templates-vault',
    description: `Everything you need to start talking to sellers and making offers immediately. Eliminate the fear of prospecting with proven scripts and legally-vetted contracts.

Includes:
• Cold call scripts
• Text & DM scripts
• Assignment contract
• Purchase contract
• Dialogue frames for every situation

Perfect for: Wholesalers who want ready-to-use scripts and contracts to start making offers today.`,
    shortDesc: 'Proven scripts, templates, and contracts to start wholesaling immediately.',
    price: 1700, // $17
    tier: 'low',
    order: 3,
    modules: [
      {
        title: 'Scripts & Dialogues',
        order: 1,
        lessons: [
          { title: 'Cold Call Script Breakdown', order: 1, isFree: true },
          { title: 'Text & DM Scripts That Convert', order: 2 },
          { title: 'Handling Common Objections', order: 3 },
          { title: 'The Perfect Follow-Up Sequence', order: 4 },
        ]
      },
      {
        title: 'Contracts & Templates',
        order: 2,
        lessons: [
          { title: 'Assignment Contract Explained', order: 1 },
          { title: 'Purchase Contract Walkthrough', order: 2 },
          { title: 'Download All Templates', order: 3 },
        ]
      }
    ]
  },
  {
    title: 'Creative Finance Quick-Start Course',
    slug: 'creative-finance-quick-start',
    description: `Discover how to acquire properties with little to no money down using creative financing strategies. This 90-minute intensive breaks down subject-to, seller financing, and hybrid structures in plain English.

Includes:
• 90-minute breakdown of subject-to, seller finance, hybrids
• Negotiation scripts (Todd's specialty)
• How to structure deals with $0 down
• Real deal examples

Perfect for: Investors who want to learn creative acquisition strategies without needing bank financing.`,
    shortDesc: 'Learn creative financing strategies to acquire properties with $0 down.',
    price: 4700, // $47
    tier: 'low',
    order: 4,
    modules: [
      {
        title: 'Creative Finance Foundations',
        order: 1,
        lessons: [
          { title: 'Why Creative Finance Changes Everything', order: 1, isFree: true },
          { title: 'Subject-To Deals Explained', order: 2 },
          { title: 'Seller Financing Structures', order: 3 },
          { title: 'Hybrid Deal Structures', order: 4 },
        ]
      },
      {
        title: 'Scripts & Negotiation',
        order: 2,
        lessons: [
          { title: 'The Creative Finance Pitch', order: 1 },
          { title: 'Negotiation Scripts That Work', order: 2 },
          { title: 'Real $0 Down Deal Examples', order: 3 },
        ]
      }
    ]
  },
  {
    title: '30-Day Real Estate Jumpstart Challenge',
    slug: '30-day-jumpstart-challenge',
    description: `Build unstoppable momentum with daily micro-assignments designed to get you taking action immediately. In just 30 days, you'll develop the habits and skills of a successful real estate investor.

Includes:
• Daily micro-assignments
• Accountability group access
• End-of-challenge certificate
• Progress tracking

Perfect for: Action-takers who want structure and accountability to kickstart their investing journey.`,
    shortDesc: '30 days of daily actions to build unstoppable momentum in real estate.',
    price: 3700, // $37
    tier: 'low',
    order: 5,
    modules: [
      {
        title: 'Week 1: Foundation',
        order: 1,
        lessons: [
          { title: 'Day 1: Define Your Why', order: 1, isFree: true },
          { title: 'Day 2: Choose Your Strategy', order: 2 },
          { title: 'Day 3: Set Up Your Systems', order: 3 },
          { title: 'Day 4: Find Your Market', order: 4 },
          { title: 'Day 5: Build Your Team List', order: 5 },
          { title: 'Day 6: Create Your Criteria', order: 6 },
          { title: 'Day 7: Week 1 Review', order: 7 },
        ]
      },
      {
        title: 'Week 2: Lead Generation',
        order: 2,
        lessons: [
          { title: 'Day 8: Driving for Dollars', order: 1 },
          { title: 'Day 9: Online Lead Sources', order: 2 },
          { title: 'Day 10: Cold Calling Basics', order: 3 },
          { title: 'Day 11: Direct Mail Intro', order: 4 },
          { title: 'Day 12: Networking Events', order: 5 },
          { title: 'Day 13: Social Media Leads', order: 6 },
          { title: 'Day 14: Week 2 Review', order: 7 },
        ]
      },
      {
        title: 'Week 3: Deal Analysis',
        order: 3,
        lessons: [
          { title: 'Day 15: Running Comps', order: 1 },
          { title: 'Day 16: ARV Calculation', order: 2 },
          { title: 'Day 17: Repair Estimates', order: 3 },
          { title: 'Day 18: Making Offers', order: 4 },
          { title: 'Day 19: Negotiation Practice', order: 5 },
          { title: 'Day 20: Deal Structure', order: 6 },
          { title: 'Day 21: Week 3 Review', order: 7 },
        ]
      },
      {
        title: 'Week 4: Closing Deals',
        order: 4,
        lessons: [
          { title: 'Day 22: Due Diligence', order: 1 },
          { title: 'Day 23: Funding Options', order: 2 },
          { title: 'Day 24: Title & Escrow', order: 3 },
          { title: 'Day 25: Exit Strategies', order: 4 },
          { title: 'Day 26: Building Your Pipeline', order: 5 },
          { title: 'Day 27: Scaling Systems', order: 6 },
          { title: 'Day 28-30: Challenge Completion', order: 7 },
        ]
      }
    ]
  },

  // ============================================
  // MID-TICKET OFFERS ($297 - $1,497)
  // ============================================
  {
    title: 'The Real Estate Accelerator',
    slug: 'real-estate-accelerator',
    description: `The flagship comprehensive training program that takes you from complete beginner to closing your own deals. This is the most complete real estate investing education available, featuring 50+ training videos, templates, and weekly Q&A calls.

Includes:
• Real estate foundations
• Wholesaling step-by-step
• Fix & flip from A-Z
• Multi-family and single-family investing
• Deal flow systems
• Creative finance structures
• Funding & private money
• Contractor management
• Negotiation mastery (Todd's superpower)
• Scaling strategies
• 50+ training videos
• Templates & calculators
• Worksheets
• Weekly Q&A calls
• Private student community

Perfect for: Serious investors ready to build a profitable real estate business.`,
    shortDesc: 'The complete real estate investing education - from beginner to deal closer.',
    price: 99700, // $997
    tier: 'mid',
    order: 6,
    featured: true,
    modules: [
      {
        title: 'Real Estate Foundations',
        order: 1,
        lessons: [
          { title: 'Welcome to the Accelerator', order: 1, isFree: true },
          { title: 'The Real Estate Investing Landscape', order: 2 },
          { title: 'Choosing Your Investment Strategy', order: 3 },
          { title: 'Understanding Market Cycles', order: 4 },
          { title: 'Building Your Success Mindset', order: 5 },
        ]
      },
      {
        title: 'Wholesaling Mastery',
        order: 2,
        lessons: [
          { title: 'Wholesaling Fundamentals', order: 1 },
          { title: 'Finding Motivated Sellers', order: 2 },
          { title: 'Lead Generation Systems', order: 3 },
          { title: 'Making Offers That Get Accepted', order: 4 },
          { title: 'Building Your Buyers List', order: 5 },
          { title: 'Assignment Contracts Deep Dive', order: 6 },
          { title: 'Double Closings Explained', order: 7 },
          { title: 'Closing Your First Wholesale Deal', order: 8 },
        ]
      },
      {
        title: 'Fix & Flip Academy',
        order: 3,
        lessons: [
          { title: 'Fix & Flip Overview', order: 1 },
          { title: 'Finding Flip Properties', order: 2 },
          { title: 'Accurate Repair Estimates', order: 3 },
          { title: 'Managing Contractors', order: 4 },
          { title: 'Project Management Systems', order: 5 },
          { title: 'Staging & Selling', order: 6 },
          { title: 'Flip Profit Maximization', order: 7 },
        ]
      },
      {
        title: 'Rental Property Investing',
        order: 4,
        lessons: [
          { title: 'Buy & Hold Strategy', order: 1 },
          { title: 'Single-Family Rentals', order: 2 },
          { title: 'Multi-Family Investing', order: 3 },
          { title: 'Cash Flow Analysis', order: 4 },
          { title: 'Property Management', order: 5 },
          { title: 'Building a Rental Portfolio', order: 6 },
        ]
      },
      {
        title: 'Creative Finance Strategies',
        order: 5,
        lessons: [
          { title: 'Introduction to Creative Finance', order: 1 },
          { title: 'Subject-To Deals', order: 2 },
          { title: 'Seller Financing', order: 3 },
          { title: 'Lease Options', order: 4 },
          { title: 'Wraparound Mortgages', order: 5 },
          { title: 'Hybrid Structures', order: 6 },
          { title: 'Creative Finance Negotiations', order: 7 },
        ]
      },
      {
        title: 'Funding Your Deals',
        order: 6,
        lessons: [
          { title: 'Funding Options Overview', order: 1 },
          { title: 'Hard Money Lenders', order: 2 },
          { title: 'Private Money Fundamentals', order: 3 },
          { title: 'Raising Private Capital', order: 4 },
          { title: 'Building Lender Relationships', order: 5 },
          { title: 'The Perfect Lender Pitch', order: 6 },
        ]
      },
      {
        title: 'Negotiation Mastery',
        order: 7,
        lessons: [
          { title: 'The Psychology of Negotiation', order: 1 },
          { title: 'Seller Negotiation Strategies', order: 2 },
          { title: 'Buyer Negotiation Tactics', order: 3 },
          { title: 'Win-Win Deal Structures', order: 4 },
          { title: 'Handling Objections', order: 5 },
          { title: 'Advanced Negotiation Scripts', order: 6 },
        ]
      },
      {
        title: 'Scaling Your Business',
        order: 8,
        lessons: [
          { title: 'From Deals to Business', order: 1 },
          { title: 'Building Your Team', order: 2 },
          { title: 'Systems & Automation', order: 3 },
          { title: 'Deal Flow Optimization', order: 4 },
          { title: 'Scaling to 7 Figures', order: 5 },
        ]
      }
    ]
  },
  {
    title: 'The Deal Vault Add-On',
    slug: 'deal-vault-addon',
    description: `Go behind the scenes of real deals with actual documentation from Todd's flips and creative finance acquisitions. See exactly how real deals work with real numbers, real contracts, and real results.

Includes:
• Real HUDs from actual flips
• Real creative finance deal structures
• Lender pitch decks
• Private money scripts
• Real contractor bids
• Inspection reports
• Before/after breakdowns with full numbers

Perfect for: Students who want to see exactly how real deals are structured and executed.`,
    shortDesc: 'Real deal documentation - HUDs, contracts, bids, and full breakdowns.',
    price: 29700, // $297
    tier: 'mid',
    order: 7,
    modules: [
      {
        title: 'Real Flip Deal Breakdowns',
        order: 1,
        lessons: [
          { title: 'Deal Vault Introduction', order: 1, isFree: true },
          { title: 'Flip #1: The $47K Profit Flip', order: 2 },
          { title: 'Flip #2: The Probate Deal', order: 3 },
          { title: 'Flip #3: The REO Acquisition', order: 4 },
          { title: 'Flip #4: The Wholesale to Flip', order: 5 },
        ]
      },
      {
        title: 'Creative Finance Deals',
        order: 2,
        lessons: [
          { title: 'Subject-To Deal #1', order: 1 },
          { title: 'Seller Finance Deal #1', order: 2 },
          { title: 'Hybrid Structure Deal', order: 3 },
          { title: 'The $0 Down Acquisition', order: 4 },
        ]
      },
      {
        title: 'Documents & Templates',
        order: 3,
        lessons: [
          { title: 'HUD Statements Explained', order: 1 },
          { title: 'Contractor Bid Analysis', order: 2 },
          { title: 'Lender Pitch Deck Walkthrough', order: 3 },
          { title: 'Download All Deal Documents', order: 4 },
        ]
      }
    ]
  },
  {
    title: '6-Week Implementation Bootcamp',
    slug: '6-week-implementation-bootcamp',
    description: `Turn your knowledge into action with intensive weekly accountability and hands-on deal work. This isn't another course - it's a structured implementation program designed to get you results FAST.

Includes:
• Weekly live coaching calls
• Weekly homework assignments
• Breakout groups for accountability
• Deal feedback and review
• Fast-start activation protocols

Perfect for: Students who have the knowledge but need structure and accountability to take action.`,
    shortDesc: 'Intensive 6-week program to turn knowledge into closed deals.',
    price: 49700, // $497
    tier: 'mid',
    order: 8,
    modules: [
      {
        title: 'Week 1: Activation',
        order: 1,
        lessons: [
          { title: 'Bootcamp Kickoff', order: 1, isFree: true },
          { title: 'Setting Your 6-Week Goals', order: 2 },
          { title: 'Your Action Plan', order: 3 },
          { title: 'Week 1 Assignment', order: 4 },
        ]
      },
      {
        title: 'Week 2: Lead Generation Intensive',
        order: 2,
        lessons: [
          { title: 'Week 2 Training', order: 1 },
          { title: 'Building Your Lead Machine', order: 2 },
          { title: 'Week 2 Assignment', order: 3 },
        ]
      },
      {
        title: 'Week 3: Offer Making',
        order: 3,
        lessons: [
          { title: 'Week 3 Training', order: 1 },
          { title: 'Making Offers Daily', order: 2 },
          { title: 'Week 3 Assignment', order: 3 },
        ]
      },
      {
        title: 'Week 4: Negotiation Practice',
        order: 4,
        lessons: [
          { title: 'Week 4 Training', order: 1 },
          { title: 'Live Negotiation Roleplay', order: 2 },
          { title: 'Week 4 Assignment', order: 3 },
        ]
      },
      {
        title: 'Week 5: Deal Structuring',
        order: 5,
        lessons: [
          { title: 'Week 5 Training', order: 1 },
          { title: 'Structuring Your Deals', order: 2 },
          { title: 'Week 5 Assignment', order: 3 },
        ]
      },
      {
        title: 'Week 6: Closing & Beyond',
        order: 6,
        lessons: [
          { title: 'Week 6 Training', order: 1 },
          { title: 'Closing Your Deals', order: 2 },
          { title: 'Your 90-Day Plan', order: 3 },
          { title: 'Bootcamp Graduation', order: 4 },
        ]
      }
    ]
  },

  // ============================================
  // HIGH-TICKET OFFERS ($3,000 - $8,000)
  // ============================================
  {
    title: 'Maxxed Out Real Estate Mastermind',
    slug: 'maxxed-out-mastermind',
    description: `Join an elite network of serious real estate investors in this annual mastermind program. Surround yourself with high-performers, get direct access to Todd, and accelerate your success through powerful connections.

Includes:
• 2-day in-person mastermind event
• Monthly group coaching calls
• Deal review sessions
• Private mastermind-only community
• Access to guest speakers and experts
• Resource sharing: lenders, partners, contacts

Perfect for: Committed investors ready to level up through networking and high-level coaching.`,
    shortDesc: 'Elite annual mastermind with in-person events and monthly coaching.',
    price: 500000, // $5,000
    tier: 'high',
    order: 9,
    modules: [
      {
        title: 'Mastermind Orientation',
        order: 1,
        lessons: [
          { title: 'Welcome to the Mastermind', order: 1 },
          { title: 'How to Get Maximum Value', order: 2 },
          { title: 'Community Guidelines', order: 3 },
          { title: 'Meet Your Fellow Members', order: 4 },
        ]
      },
      {
        title: 'Monthly Call Recordings',
        order: 2,
        lessons: [
          { title: 'Monthly Calls Archive', order: 1 },
        ]
      },
      {
        title: 'Event Materials',
        order: 3,
        lessons: [
          { title: 'In-Person Event Details', order: 1 },
          { title: 'Event Recordings', order: 2 },
        ]
      },
      {
        title: 'Resources & Contacts',
        order: 4,
        lessons: [
          { title: 'Vetted Lender List', order: 1 },
          { title: 'Partner Directory', order: 2 },
          { title: 'Exclusive Resources', order: 3 },
        ]
      }
    ]
  },
  {
    title: 'Done-With-You Deal Accelerator',
    slug: 'done-with-you-deal-accelerator',
    description: `Get hands-on guidance through your first (or next) deal with Todd walking you through every step. This isn't just coaching - Todd actively helps you find, analyze, negotiate, and close a real deal.

Includes:
• Help finding a deal in your market
• Deal underwriting assistance
• Negotiation coaching and strategy
• Financing structure guidance
• Support through closing

Perfect for: Investors who want hands-on help closing their first or next deal.`,
    shortDesc: 'Hands-on deal support from finding to closing with Todd\'s guidance.',
    price: 350000, // $3,500
    tier: 'high',
    order: 10,
    modules: [
      {
        title: 'Getting Started',
        order: 1,
        lessons: [
          { title: 'Program Overview & Kickoff', order: 1 },
          { title: 'Your Deal Criteria', order: 2 },
          { title: 'Market Analysis', order: 3 },
        ]
      },
      {
        title: 'Finding Your Deal',
        order: 2,
        lessons: [
          { title: 'Lead Generation Strategy', order: 1 },
          { title: 'Deal Pipeline Setup', order: 2 },
          { title: 'Evaluating Opportunities', order: 3 },
        ]
      },
      {
        title: 'Deal Execution',
        order: 3,
        lessons: [
          { title: 'Underwriting Your Deal', order: 1 },
          { title: 'Negotiation Strategy Session', order: 2 },
          { title: 'Structuring the Financing', order: 3 },
          { title: 'Closing Process', order: 4 },
        ]
      }
    ]
  },
  {
    title: 'Creative Finance Inner Circle',
    slug: 'creative-finance-inner-circle',
    description: `Master the art of creative deal structuring in this intensive 8-week advanced program. Learn Todd's exact negotiation strategies and deal structures that have generated 9-figure results.

Includes:
• 8-week advanced negotiation training
• Live roleplay sessions
• Step-by-step creative deal breakdowns
• Todd's biggest win case studies
• Access to Todd's deal negotiation journal

Perfect for: Experienced investors ready to master creative financing and advanced negotiations.`,
    shortDesc: 'Advanced 8-week creative finance and negotiation mastery program.',
    price: 750000, // $7,500
    tier: 'high',
    order: 11,
    modules: [
      {
        title: 'Week 1-2: Advanced Subject-To',
        order: 1,
        lessons: [
          { title: 'Subject-To Mastery Overview', order: 1 },
          { title: 'Due-on-Sale Clause Strategy', order: 2 },
          { title: 'Insurance & Legal Structures', order: 3 },
          { title: 'Week 1-2 Roleplay Sessions', order: 4 },
        ]
      },
      {
        title: 'Week 3-4: Seller Finance Structures',
        order: 2,
        lessons: [
          { title: 'Advanced Seller Financing', order: 1 },
          { title: 'Note Creation & Terms', order: 2 },
          { title: 'Balloon Strategies', order: 3 },
          { title: 'Week 3-4 Roleplay Sessions', order: 4 },
        ]
      },
      {
        title: 'Week 5-6: Hybrid & Complex Deals',
        order: 3,
        lessons: [
          { title: 'Hybrid Deal Structures', order: 1 },
          { title: 'Wraparound Mortgages', order: 2 },
          { title: 'Multi-Party Deals', order: 3 },
          { title: 'Week 5-6 Roleplay Sessions', order: 4 },
        ]
      },
      {
        title: 'Week 7-8: Negotiation Mastery',
        order: 4,
        lessons: [
          { title: 'Todd\'s Negotiation Framework', order: 1 },
          { title: 'Reading Sellers', order: 2 },
          { title: 'The Deal Negotiation Journal', order: 3 },
          { title: 'Final Roleplay Sessions', order: 4 },
          { title: 'Inner Circle Graduation', order: 5 },
        ]
      }
    ]
  },

  // ============================================
  // ELITE OFFERS ($15,000 - $50,000)
  // ============================================
  {
    title: '12-Month Private Mentorship with Todd',
    slug: 'private-mentorship-12-month',
    description: `The ultimate access: work directly with Todd for an entire year with private Voxer access, monthly 1-on-1 calls, and real-time deal guidance. Get the same playbook Todd used to build a 9-figure portfolio.

Includes:
• Private Voxer access to Todd
• Monthly 1-on-1 strategy calls
• Real-time deal analysis
• Negotiation strategy for your deals
• Business-building blueprint
• Access to ALL courses and programs
• VIP tickets to all events

Perfect for: Serious investors who want direct mentorship and the fast track to success.`,
    shortDesc: 'Direct 1-on-1 mentorship with Todd for 12 months plus full platform access.',
    price: 2500000, // $25,000
    tier: 'elite',
    order: 12,
    modules: [
      {
        title: 'Mentorship Orientation',
        order: 1,
        lessons: [
          { title: 'Welcome to Private Mentorship', order: 1 },
          { title: 'Setting Up Voxer', order: 2 },
          { title: 'Your 12-Month Roadmap', order: 3 },
          { title: 'Scheduling Your Calls', order: 4 },
        ]
      },
      {
        title: 'Your Business Blueprint',
        order: 2,
        lessons: [
          { title: 'Building Your Investing Business', order: 1 },
          { title: 'Scaling Strategies', order: 2 },
          { title: 'Team Building', order: 3 },
        ]
      },
      {
        title: 'Call Recordings & Notes',
        order: 3,
        lessons: [
          { title: 'Your Call Archive', order: 1 },
        ]
      }
    ]
  },
  {
    title: 'Partnership Program',
    slug: 'partnership-program',
    description: `Partner directly with Todd on real deals. This exclusive program brings Todd's strategy, creative structuring expertise, capital relationships, contractor resources, and brokerage & property management capabilities to your deals.

Includes:
• Deal partnership structure
• Access to Todd's strategy expertise
• Creative structuring support
• Capital relationship introductions
• Contractor resources
• Brokerage & property management access

Application Required - Limited Spots Available

Perfect for: Experienced investors ready to scale through strategic partnerships.`,
    shortDesc: 'Partner with Todd on real deals - application required.',
    price: 2000000, // $20,000 + equity
    tier: 'elite',
    order: 13,
    modules: [
      {
        title: 'Partnership Overview',
        order: 1,
        lessons: [
          { title: 'Partnership Structure', order: 1 },
          { title: 'Deal Criteria', order: 2 },
          { title: 'Roles & Responsibilities', order: 3 },
          { title: 'Profit Sharing', order: 4 },
        ]
      },
      {
        title: 'Resources & Access',
        order: 2,
        lessons: [
          { title: 'Capital Partners', order: 1 },
          { title: 'Contractor Network', order: 2 },
          { title: 'Brokerage Services', order: 3 },
          { title: 'Property Management', order: 4 },
        ]
      },
      {
        title: 'Active Deals',
        order: 3,
        lessons: [
          { title: 'Deal Pipeline', order: 1 },
          { title: 'Deal Documentation', order: 2 },
        ]
      }
    ]
  },
  {
    title: 'Done-For-You Real Estate Business Launch',
    slug: 'dfy-business-launch',
    description: `Get a complete real estate business built for you, ready to scale. Todd and his team will set up your entire operation - whether you want a wholesaling company, flipping operation, or rental acquisition business.

Includes:
• Complete business setup (your choice):
  - Wholesaling company OR
  - Flipping operation OR
  - Rental acquisition company
• CRM setup and configuration
• Scripts and SOPs
• VA hiring and training
• Marketing setup (SMS, cold calling, ads)
• 90-day coaching and support

Perfect for: Entrepreneurs who want a turnkey real estate business ready to scale.`,
    shortDesc: 'Complete business-in-a-box with CRM, VAs, marketing, and 90-day support.',
    price: 5000000, // $50,000
    tier: 'elite',
    order: 14,
    modules: [
      {
        title: 'Business Setup',
        order: 1,
        lessons: [
          { title: 'Kickoff & Strategy Session', order: 1 },
          { title: 'Entity Structure', order: 2 },
          { title: 'CRM Configuration', order: 3 },
          { title: 'Systems Overview', order: 4 },
        ]
      },
      {
        title: 'Operations',
        order: 2,
        lessons: [
          { title: 'SOPs & Documentation', order: 1 },
          { title: 'Script Library', order: 2 },
          { title: 'Workflow Automation', order: 3 },
        ]
      },
      {
        title: 'Team Building',
        order: 3,
        lessons: [
          { title: 'VA Hiring Process', order: 1 },
          { title: 'VA Training Program', order: 2 },
          { title: 'Team Management', order: 3 },
        ]
      },
      {
        title: 'Marketing Setup',
        order: 4,
        lessons: [
          { title: 'SMS Campaigns', order: 1 },
          { title: 'Cold Calling Setup', order: 2 },
          { title: 'Paid Advertising', order: 3 },
          { title: 'Lead Tracking', order: 4 },
        ]
      },
      {
        title: '90-Day Coaching',
        order: 5,
        lessons: [
          { title: 'Week 1-4 Coaching', order: 1 },
          { title: 'Week 5-8 Coaching', order: 2 },
          { title: 'Week 9-12 Coaching', order: 3 },
          { title: 'Graduation & Ongoing Support', order: 4 },
        ]
      }
    ]
  }
];

async function main() {
  console.log('Starting course seeding...\n');

  for (const courseData of courses) {
    const { modules, tier, ...courseFields } = courseData;

    // Check if course already exists
    const existing = await prisma.course.findUnique({
      where: { slug: courseFields.slug }
    });

    if (existing) {
      console.log(`Skipping existing course: ${courseFields.title}`);
      continue;
    }

    console.log(`Creating course: ${courseFields.title} ($${(courseFields.price / 100).toFixed(2)})`);

    // Create course
    const course = await prisma.course.create({
      data: {
        ...courseFields,
        published: true,
      }
    });

    // Create modules and lessons
    for (const moduleData of modules) {
      const { lessons, ...moduleFields } = moduleData;

      const module = await prisma.module.create({
        data: {
          ...moduleFields,
          courseId: course.id,
        }
      });

      for (const lessonData of lessons) {
        await prisma.lesson.create({
          data: {
            ...lessonData,
            slug: lessonData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            moduleId: module.id,
            videoDuration: Math.floor(Math.random() * 1200) + 300, // 5-25 min placeholder
          }
        });
      }
    }

    console.log(`  - Created ${modules.length} modules with lessons\n`);
  }

  console.log('\n=== Course Seeding Complete ===\n');

  // Print summary
  const allCourses = await prisma.course.findMany({
    orderBy: { order: 'asc' },
    select: { title: true, price: true, slug: true }
  });

  console.log('All Courses:');
  for (const course of allCourses) {
    const price = course.price ? `$${(course.price / 100).toFixed(2)}` : 'Free';
    console.log(`  - ${course.title} (${price})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
