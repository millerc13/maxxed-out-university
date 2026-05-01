import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCELERATOR_ONLY_ID = 'cmol2felg000113yn9b4olcgo'; // Business Accelerator ($35k, no mentorship)

const MARKDOWN_DESCRIPTION = `## Business Accelerator

This is not marketing. This is **infrastructure** — a system that runs daily, captures demand, and turns attention into booked jobs.

Built using the same principles that scale **7, 8, and 9-figure companies**.

### What You're Getting

**1. Single High-Converting Funnel System**

We will build one dominant funnel engineered specifically for your business or offer. This funnel will capture inbound demand and convert traffic into booked appointments.

Includes:
- Custom funnel architecture
- Offer creation
- Conversion-driven landing page
- Call-to-action optimization (book now / call now / request quote)

**2. Landing Page + Full Creative Buildout**

We handle everything front-end:
- Custom-designed landing page (mobile + desktop optimized)
- High-converting copywriting
- Brand-aligned design
- Trust builders (reviews, authority, service positioning)
- Visual hierarchy designed for conversions

**3. Offer Creation + Market Positioning**

This is where most companies fail — we fix it. We build an offer that makes customers choose you.

Includes:
- Offer structuring
- Competitive positioning strategy
- Messaging that speaks directly to your avatar
- Launch strategy for immediate traction

**4. Video + VSL (Video Sales System)**

Strong video converts. Period. We guide and produce:
- Video Sales Letter (VSL)
- Service explanation videos
- Ad creatives for Meta platforms

Includes:
- Script guidance (what to say + how to say it)
- Recording direction
- Full professional editing

**5. CRM + Automation System (White-Labeled Platform)**

We centralize everything into one system:
- Lead capture + tracking
- Automated text follow-ups
- Email drip campaigns
- Pipeline management
- Missed-call text-back
- Smart automation workflows

This ensures no lead is lost and every lead is worked automatically.

**6. Meta Ads Management (First 90 Days Included)**

We don't just build — we drive traffic.
- Dedicated Meta media buyer
- Campaign setup + management
- Audience targeting
- Creative testing + optimization

> **Important:** Ad spend is paid directly by client and not covered in the package. This covers management + execution only.

**7. Content Strategy + Brand Alignment**

We align your brand with your funnel:
- 30-day content strategy
- Messaging alignment across platforms
- Content direction to support lead flow

**8. Ongoing Support + Optimization (6 Months Included)**

We stay involved to ensure results:
- Funnel optimization
- Campaign adjustments
- Offer refinement
- Strategy guidance

This is where execution turns into scale.

### Investment Includes

- Full funnel system
- Landing page + creative
- Video production + VSL
- Offer creation + launch strategy
- CRM + automation setup
- 90 days Meta ads management
- Content strategy
- 6 months support

**Ongoing Platform & Automation:**
- CRM access
- Automation systems
- Communication tools (text/email)
- Backend infrastructure

### Timeline & Execution

**Phase 1 (Weeks 1–2): Strategy + Foundation**
- Funnel architecture
- Offer creation
- Positioning strategy

**Phase 2 (Weeks 2–6): Content Creation**
- Video recording + guidance
- Editing + asset development

**Phase 3 (Weeks 2–8): Buildout**
- Funnel development
- Landing page design
- Automation setup

**Phase 4 (Weeks 8–12): Optimization + Launch**
- Final testing
- Campaign alignment
- Go-live execution

**Launch Window:** 90–120 Days to Full Deployment

### Expected Outcome

This system is built to deliver:
- Consistent inbound leads
- Automated follow-up and conversion
- Higher close rates
- Scalable growth infrastructure
- Reduced dependency on manual sales

You are not buying ads. **You are installing a lead generation machine.**

### Free Resources

- Free Ebook: *"Just Real Estate Dummy"*
- Free Ebook: *"Building Wealth, Building Legacy"*

### Network Access

- Access to Todd's network
- Access to private community

### Events & Training

- Free admission to all live events Todd hosts (12 months)
- Free admission to all live webinars

This is for **serious entrepreneurs** who want Todd's team in their corner every step of the way.`;

const SHORT_DESC =
  'Done-for-you growth system — funnels, ads, automation, and media under one roof.';

async function main() {
  const updated = await prisma.course.update({
    where: { id: ACCELERATOR_ONLY_ID },
    data: {
      description: MARKDOWN_DESCRIPTION,
      shortDesc: SHORT_DESC,
    },
    select: { id: true, title: true, slug: true, price: true, published: true },
  });
  console.log('Updated:', JSON.stringify(updated, null, 2));
  console.log(`\nDescription length: ${MARKDOWN_DESCRIPTION.length} chars`);
  await prisma.$disconnect();
}

main();
