# Maxxed Out University - Custom Course Platform

## Project Overview

Building a custom online learning platform ("Maxxed Out University") for real estate investment education. This is a ground-up build designed to rival platforms like Cardone University, with full control over branding, features, and user experience.

**Owner:** Todd Pultz / Maxxed Out
**Primary Use Case:** Real estate investment courses, training modules, and community for students
**Integration Required:** GoHighLevel (GHL) for marketing automation, lead gen, and payment processing

---

## Design Reference

### HTML Mockup

There is a reference HTML/CSS/JS page that has been built as a design mockup. This file serves as the **visual design source of truth** for the platform. When building out components and pages in Next.js:

1. **Reference the HTML file first** to understand the intended design, layout, and styling
2. **Match the visual design** as closely as possible when converting to React components
3. **Extract the CSS patterns** and convert them to Tailwind utility classes
4. **Preserve all interactions** that are mocked in the JavaScript
5. **Maintain the same color scheme, typography, and spacing**

The HTML mockup location: `./reference/index.html` (or provided in the project root)

When Claude Code starts working on UI components, it should:
- Open and analyze the HTML mockup file first
- Identify the component structure and hierarchy
- Note all CSS custom properties, colors, and design tokens
- Understand the responsive breakpoints used
- Replicate animations and transitions

### Assets Folder

There is an `images/` folder containing all visual assets for the platform. These include:

- Logo files (various formats/sizes)
- Course thumbnails
- Instructor photos
- UI icons and graphics
- Background images
- Placeholder images

**When building components, use assets from the `images/` folder.** Reference them in Next.js using:

```tsx
// For public assets (recommended)
<Image src="/images/logo.png" alt="Maxxed Out University" width={200} height={50} />

// Or import directly
import logo from '@/public/images/logo.png';
```

Copy the `images/` folder to the `public/` directory in the Next.js project so they're accessible at `/images/*`.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** Zustand or React Context (keep it simple)
- **Video Player:** Video.js or Plyr (customizable, supports HLS)
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js
- **Framework:** Next.js API Routes (or separate Express/Fastify if needed)
- **Database:** PostgreSQL via Prisma ORM
- **Authentication:** NextAuth.js with magic link + credentials
- **File Storage:** Cloudflare R2 or AWS S3
- **Video Hosting:** Cloudflare Stream or Mux (HLS streaming, signed URLs)

### Infrastructure
- **Hosting:** Vercel (frontend) + Railway or Render (database)
- **CDN:** Cloudflare
- **Email:** Resend or SendGrid (transactional emails)
- **Payments:** Stripe (webhooks from GHL or direct)

---

## Project Structure

```
maxxed-out-university/
├── reference/                  # Design reference files
│   └── index.html              # HTML/CSS/JS mockup - USE AS DESIGN GUIDE
├── images/                     # Source assets - COPY TO public/images/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes (login, register, magic-link)
│   │   ├── (dashboard)/        # Student dashboard (protected)
│   │   │   ├── courses/        # Course listing and enrollment
│   │   │   ├── learn/[courseId]/[lessonId]/  # Video player + lesson view
│   │   │   ├── progress/       # Student progress tracking
│   │   │   └── certificates/   # Earned certificates
│   │   ├── (admin)/            # Admin CMS (protected, role-based)
│   │   │   ├── courses/        # CRUD courses
│   │   │   ├── lessons/        # CRUD lessons
│   │   │   ├── users/          # User management
│   │   │   └── analytics/      # Engagement metrics
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # NextAuth endpoints
│   │   │   ├── webhooks/       # GHL + Stripe webhooks
│   │   │   ├── courses/        # Course CRUD API
│   │   │   ├── progress/       # Progress tracking API
│   │   │   └── enroll/         # Enrollment endpoint (called by GHL)
│   │   ├── layout.tsx
│   │   └── page.tsx            # Marketing landing (or redirect)
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── course/             # Course-specific components
│   │   ├── video/              # Video player components
│   │   ├── progress/           # Progress bars, completion indicators
│   │   └── layout/             # Navigation, sidebar, headers
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client
│   │   ├── auth.ts             # NextAuth config
│   │   ├── stripe.ts           # Stripe utilities
│   │   ├── video.ts            # Video hosting utilities (signed URLs)
│   │   ├── ghl.ts              # GoHighLevel API utilities
│   │   └── utils.ts            # General utilities
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript types
│   └── styles/
│       └── globals.css         # Tailwind + custom styles from mockup
├── public/
│   └── images/                 # Static assets - COPY FROM images/ FOLDER
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data for development
├── .env.local                  # Environment variables (not committed)
├── .env.example                # Example env file
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Design System (Extract from HTML Mockup)

When analyzing the HTML mockup, extract and document these design tokens:

### Colors
```css
/* Extract from mockup CSS and add to tailwind.config.ts */
:root {
  --color-primary: /* extract from mockup */;
  --color-secondary: /* extract from mockup */;
  --color-accent: /* extract from mockup */;
  --color-background: /* extract from mockup */;
  --color-surface: /* extract from mockup */;
  --color-text: /* extract from mockup */;
  --color-text-muted: /* extract from mockup */;
  --color-success: /* extract from mockup */;
  --color-warning: /* extract from mockup */;
  --color-error: /* extract from mockup */;
}
```

### Typography
```css
/* Extract font families, sizes, weights from mockup */
--font-heading: /* extract */;
--font-body: /* extract */;
```

### Spacing & Layout
- Note the grid system used
- Document padding/margin patterns
- Identify breakpoints for responsive design

### Components to Extract
When building, identify these components from the HTML mockup:
- [ ] Navigation/Header
- [ ] Sidebar (course navigation)
- [ ] Course Card
- [ ] Lesson List Item
- [ ] Video Player Container
- [ ] Progress Bar
- [ ] Button variants
- [ ] Form inputs
- [ ] Cards/Panels
- [ ] Footer

---

## Database Schema (Prisma)

### Core Models

```prisma
// User - Students and Admins
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  role          Role      @default(STUDENT)
  ghlContactId  String?   // GoHighLevel contact ID for sync
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  enrollments   Enrollment[]
  progress      LessonProgress[]
  certificates  Certificate[]
}

enum Role {
  STUDENT
  INSTRUCTOR
  ADMIN
}

// Course - Top level container
model Course {
  id            String    @id @default(cuid())
  title         String
  slug          String    @unique
  description   String?   @db.Text
  thumbnail     String?
  price         Int?      // Price in cents (null = free or handled by GHL)
  published     Boolean   @default(false)
  order         Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  modules       Module[]
  enrollments   Enrollment[]
  certificates  Certificate[]
}

// Module - Groups lessons within a course
model Module {
  id            String    @id @default(cuid())
  title         String
  description   String?
  order         Int       @default(0)
  courseId      String
  course        Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  lessons       Lesson[]
}

// Lesson - Individual video/content units
model Lesson {
  id            String    @id @default(cuid())
  title         String
  slug          String
  description   String?   @db.Text
  videoUrl      String?   // Cloudflare Stream or Mux playback ID
  videoDuration Int?      // Duration in seconds
  content       String?   @db.Text  // Rich text content (below video)
  order         Int       @default(0)
  isFree        Boolean   @default(false)  // Preview lessons
  moduleId      String
  module        Module    @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  
  progress      LessonProgress[]
  resources     Resource[]
}

// Resource - Downloadable files attached to lessons
model Resource {
  id            String    @id @default(cuid())
  title         String
  fileUrl       String
  fileType      String    // pdf, xlsx, docx, etc.
  lessonId      String
  lesson        Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

// Enrollment - Links users to courses they have access to
model Enrollment {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId      String
  course        Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  enrolledAt    DateTime  @default(now())
  expiresAt     DateTime? // For time-limited access
  source        String?   // "ghl", "stripe", "manual", "free"
  transactionId String?   // Stripe or GHL transaction reference
  
  @@unique([userId, courseId])
}

// LessonProgress - Tracks completion per lesson
model LessonProgress {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId      String
  lesson        Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  completed     Boolean   @default(false)
  watchedSeconds Int      @default(0)  // For resume functionality
  completedAt   DateTime?
  updatedAt     DateTime  @updatedAt
  
  @@unique([userId, lessonId])
}

// Certificate - Generated on course completion
model Certificate {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId      String
  course        Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  issuedAt      DateTime  @default(now())
  certificateUrl String?  // Generated PDF URL
  
  @@unique([userId, courseId])
}
```

---

## Key Features to Build

### Phase 1: MVP (Core Platform)
- [ ] User authentication (magic link + password)
- [ ] Student dashboard with enrolled courses
- [ ] Course listing page
- [ ] Video player with progress tracking
- [ ] Lesson completion marking
- [ ] Basic progress display (X of Y lessons complete)
- [ ] GHL webhook endpoint for enrollment
- [ ] Admin: Create/edit courses and lessons
- [ ] Admin: Upload videos to Cloudflare Stream
- [ ] Responsive design (mobile-friendly) - **Match HTML mockup**

### Phase 2: Enhanced Experience
- [ ] Resume video from last position
- [ ] Course progress percentage
- [ ] Drip content (unlock lessons over time)
- [ ] Downloadable resources per lesson
- [ ] Rich text editor for lesson content
- [ ] Email notifications (welcome, progress milestones)
- [ ] Student profile/settings page

### Phase 3: Engagement & Gamification
- [ ] Certificates on course completion
- [ ] Badges/achievements system
- [ ] Comments/Q&A on lessons
- [ ] Community features (discussion boards)
- [ ] Leaderboards
- [ ] Quizzes/assessments per module

### Phase 4: Scale & Analytics
- [ ] Analytics dashboard (admin)
- [ ] Student engagement metrics
- [ ] Video watch heatmaps
- [ ] A/B testing course thumbnails/titles
- [ ] Multi-instructor support
- [ ] Affiliate tracking integration
- [ ] Mobile app (React Native or Capacitor)

---

## GoHighLevel Integration

### Webhook Endpoint: `/api/webhooks/ghl`

This endpoint receives POST requests from GHL when a purchase is made.

**Expected Payload from GHL:**
```json
{
  "contact": {
    "id": "ghl_contact_abc123",
    "email": "student@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+15551234567"
  },
  "product": {
    "id": "prod_xyz",
    "name": "Real Estate Fundamentals Course"
  },
  "transaction": {
    "id": "txn_123",
    "amount": 49700,
    "currency": "usd"
  }
}
```

**Webhook Handler Logic:**
1. Verify webhook signature (if GHL provides one) or use shared secret
2. Find or create user by email
3. Map `product.id` or `product.name` to internal course ID
4. Create enrollment record
5. Send welcome email with login link (magic link)
6. Return 200 OK

**Product Mapping:**
Create a config file or database table mapping GHL product IDs to course IDs:
```typescript
// lib/ghl.ts
export const GHL_PRODUCT_MAP: Record<string, string> = {
  'ghl_prod_fundamentals': 'course_cuid_abc123',
  'ghl_prod_advanced': 'course_cuid_def456',
  'ghl_prod_bundle': 'ALL', // Special case: enroll in all courses
};
```

### GHL API Integration (Optional)

For syncing data back to GHL (e.g., updating contact when course completed):

```typescript
// lib/ghl.ts
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

export async function addTagToContact(contactId: string, tag: string) {
  await fetch(`https://rest.gohighlevel.com/v1/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tags: [tag], // e.g., "course-completed-fundamentals"
    }),
  });
}
```

---

## Authentication Flow

### Magic Link (Primary)
1. User enters email on login page
2. System generates secure token, stores in DB with expiry
3. Send email via Resend with link: `https://university.maxxedout.com/auth/verify?token=xyz`
4. User clicks link → verify token → create session → redirect to dashboard

### Password (Secondary)
- Allow users to set password in settings for convenience
- Use bcrypt for hashing
- Magic link remains fallback for "forgot password"

### Session Management
- Use NextAuth.js with JWT strategy
- Store minimal data in JWT (userId, email, role)
- Fetch full user data from DB as needed

---

## Video Hosting Setup

### Cloudflare Stream (Recommended)
- Upload videos via API or dashboard
- Get playback ID per video
- Generate signed URLs for private videos
- HLS streaming with adaptive bitrate

```typescript
// lib/video.ts
import { createHmac } from 'crypto';

export function getSignedVideoUrl(videoId: string): string {
  const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const token = createHmac('sha256', process.env.CF_STREAM_SIGNING_KEY!)
    .update(`${videoId}${expiry}`)
    .digest('hex');
  
  return `https://customer-${process.env.CF_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoId}/manifest/video.m3u8?token=${token}&expiry=${expiry}`;
}
```

### Alternative: Mux
- Similar setup, slightly easier API
- Built-in analytics
- Higher cost at scale

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/maxxed_university"

# NextAuth
NEXTAUTH_SECRET="generate-a-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxx"
EMAIL_FROM="learn@maxxedout.com"

# Video Hosting (Cloudflare Stream)
CF_STREAM_API_TOKEN="xxxxxxxx"
CF_STREAM_ACCOUNT_ID="xxxxxxxx"
CF_STREAM_SIGNING_KEY="xxxxxxxx"
CF_STREAM_CUSTOMER_CODE="xxxxxxxx"

# GoHighLevel
GHL_API_KEY="xxxxxxxx"
GHL_LOCATION_ID="xxxxxxxx"
GHL_WEBHOOK_SECRET="shared-secret-for-verification"

# Stripe (if handling payments directly)
STRIPE_SECRET_KEY="sk_live_xxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxx"

# Storage (Cloudflare R2)
R2_ACCESS_KEY_ID="xxxxxxxx"
R2_SECRET_ACCESS_KEY="xxxxxxxx"
R2_BUCKET_NAME="maxxed-university-assets"
R2_ENDPOINT="https://xxxxxxxx.r2.cloudflarestorage.com"
```

---

## Coding Conventions

### General
- Use TypeScript strict mode
- Prefer `async/await` over `.then()` chains
- Use early returns to reduce nesting
- Keep functions small and focused
- Add JSDoc comments for complex functions

### File Naming
- Components: PascalCase (`CourseCard.tsx`)
- Utilities/hooks: camelCase (`useProgress.ts`)
- API routes: lowercase with hyphens (`/api/courses/[id]/enroll`)

### Component Structure
```tsx
// components/course/CourseCard.tsx
import { type Course } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface CourseCardProps {
  course: Course;
  showProgress?: boolean;
}

export function CourseCard({ course, showProgress = false }: CourseCardProps) {
  // hooks first
  // derived state
  // handlers
  // render
}
```

### API Route Structure
```typescript
// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: { modules: { include: { lessons: true } } },
    });
    
    if (!course) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Converting HTML Mockup to React Components

When converting from the HTML mockup:

1. **Identify the component boundaries** in the HTML
2. **Extract repeated patterns** into reusable components
3. **Convert CSS to Tailwind:**
   ```html
   <!-- HTML Mockup -->
   <div class="card" style="padding: 24px; background: #1a1a2e; border-radius: 12px;">
   
   <!-- Next.js/Tailwind -->
   <div className="p-6 bg-[#1a1a2e] rounded-xl">
   ```
4. **Replace vanilla JS with React patterns:**
   ```javascript
   // Vanilla JS in mockup
   document.getElementById('btn').addEventListener('click', handleClick);
   
   // React
   <button onClick={handleClick}>
   ```
5. **Convert inline styles to Tailwind utilities or CSS modules**

### Error Handling
- Use try/catch in all API routes
- Return consistent error response shape: `{ error: string, details?: any }`
- Log errors with context for debugging
- Never expose internal errors to client in production

---

## Commands Reference

```bash
# Development
npm run dev              # Start Next.js dev server
npm run db:push          # Push schema changes to DB
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed development data

# Production
npm run build            # Build for production
npm run start            # Start production server
npm run db:migrate       # Run migrations

# Utilities
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

---

## Development Workflow

1. **Analyze HTML mockup:** Open the reference HTML file and understand the design
2. **Extract design tokens:** Document colors, fonts, spacing in tailwind.config.ts
3. **Copy assets:** Move images/ folder contents to public/images/
4. **Set up project:** Initialize Next.js with the existing package.json
5. **Build layout components:** Header, sidebar, footer matching mockup exactly
6. **Database setup:** Run prisma db push, seed initial data
7. **Auth implementation:** Get NextAuth working with magic links
8. **Core pages:** Dashboard, course list, lesson viewer - **matching mockup design**
9. **Video player:** Integrate Cloudflare Stream with progress tracking
10. **GHL webhook:** Build enrollment endpoint, test with GHL
11. **Admin CMS:** Build course/lesson management
12. **Polish:** Loading states, error handling, responsive testing

---

## Important Files to Reference

When starting development, these files should be examined first:

| File | Purpose |
|------|---------|
| `reference/index.html` | **Design mockup** - visual source of truth for all UI |
| `images/*` | **Asset library** - logos, thumbnails, icons to use in components |
| `prisma/schema.prisma` | **Database schema** - data structure |
| `.env.example` | **Environment vars** - required configuration |

---

## Notes for Claude

- **CRITICAL: Always reference the HTML mockup (`reference/index.html`) for design decisions**
- **CRITICAL: Use assets from the `images/` folder - copy to `public/images/` first**
- This is a real business application, prioritize stability and security
- CJ has strong technical background (computer engineering), don't over-explain basics
- GHL integration is critical - the platform handles all sales/marketing
- Video security matters - use signed URLs, don't expose raw video files
- Keep the UI clean and professional - **follow the mockup exactly**
- Mobile experience is important - many users will access on phones
- When building components, compare against the HTML mockup to ensure visual fidelity
- Extract any CSS custom properties or design tokens from the mockup into Tailwind config
- Before starting any UI work, analyze the mockup HTML/CSS to understand the design system
- When in doubt about design, refer to the mockup; when in doubt about logic, ask clarifying questions
