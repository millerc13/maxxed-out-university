# Maxxed Out University - Development Checklist

## Phase 1: Project Setup (Foundation) ✅ COMPLETE
- [x] Initialize Next.js 14+ project with App Router, TypeScript, and Tailwind CSS
- [x] Install and configure shadcn/ui components
- [x] Copy images/ folder to public/images/ directory
- [x] Extract design tokens from HTML mockup (colors, fonts, spacing) into tailwind.config.ts
- [x] Set up Prisma with PostgreSQL and push schema to database
- [x] Create .env.example with all required environment variables

## Phase 2: UI Components (Matching HTML Mockup) ✅ COMPLETE
- [x] Build Header/Navigation component matching mockup design
- [x] Build Hero section with mosaic animation from mockup
- [x] Build CourseCard component matching mockup design
- [x] Build courses grid/listing page
- [x] Build Training Info section with benefits grid
- [x] Build Footer component

## Phase 3: Authentication ✅ COMPLETE
- [x] Implement NextAuth.js with magic link authentication
- [x] Create login/register pages with magic link flow

## Phase 4: Student Dashboard
- [ ] Build student dashboard layout with sidebar navigation
- [ ] Build enrolled courses display on dashboard
- [ ] Build course detail page with modules/lessons list

## Phase 5: Video & Lessons
- [ ] Build video player component with HLS support (Video.js or Plyr)
- [ ] Implement lesson view page with video player and content
- [ ] Create progress tracking API endpoints
- [ ] Implement lesson completion marking and progress display

## Phase 6: Integrations
- [ ] Build GHL webhook endpoint for enrollment (/api/webhooks/ghl)
- [ ] Create enrollment API and logic
- [ ] Implement Cloudflare Stream video upload integration
- [ ] Implement signed URL generation for video security
- [ ] Set up Resend for transactional emails (magic links, welcome)

## Phase 7: Admin CMS
- [ ] Build Admin layout with protected routes
- [ ] Build Admin course CRUD pages
- [ ] Build Admin lesson/module CRUD pages
- [ ] Build Admin user management page

## Phase 8: Polish & Launch
- [ ] Add responsive design and mobile optimization
- [ ] Create seed script for development data
- [ ] Add loading states and error handling throughout
- [ ] Test full flow: GHL purchase → enrollment → course access

---

## Key Resources
| File | Purpose |
|------|---------|
| `course-landing-portal.html` | Design mockup - visual source of truth |
| `prisma/schema.prisma` | Database schema |
| `images/*` | Asset library (copy to public/images/) |
| `CLAUDE.md` | Project requirements and conventions |

## Design Tokens (from maxxedout.com/courses/portal)

### Primary Colors
- **Blue:** #0000FF (primary actions, buttons, accents)
- **Blue Dark:** #0000CC (hover states, gradients)
- **Blue Darker:** #0000AA (deeper gradients)
- **Gold:** #D4AF37 (premium accent, highlights)

### Neutral Colors
- **Background:** #f5f5f5
- **Surface/Card:** #ffffff
- **Dark Background:** #0a0a0a (footer)
- **Dark Section:** #2d3436

### Text Colors
- **Dark:** #222 (headings)
- **Body:** #555 (paragraphs)
- **Muted:** #888 (secondary)
- **Light:** #aaa (tertiary)

### Gradients
- **Primary:** linear-gradient(135deg, #0000FF, #0000CC)
- **Dark Card:** linear-gradient(135deg, #1a2a6a, #0d1545)
- **Hero Overlay:** radial-gradient(ellipse at center, rgba(0,0,0,0.4), rgba(0,0,0,0.8))

### Typography
- **Font:** Montserrat (400, 500, 600, 700, 800)

### Shadows
- **Header:** 0 2px 10px rgba(0,0,0,0.05)
- **Card:** 0 5px 20px rgba(0,0,0,0.08)
- **Card Hover:** 0 15px 40px rgba(0,0,0,0.12)
- **Hero:** 0 20px 60px rgba(0,0,0,0.2)

### Border Accents
- **Header Top:** 4px solid #0000FF
