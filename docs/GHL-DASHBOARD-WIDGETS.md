# GHL Dashboard Widgets (iframe embeds)

Live, self-refreshing dashboard widgets hosted on the university app and designed
to be iframed into **GoHighLevel custom dashboard widgets**. Built so everything —
revenue, leads, bookings, webinars, courses — is visible inside GHL without
logging into five different tools.

## How to embed in GHL

1. Log into the university admin → **Admin → Embed Widgets**
   (`https://university.maxxedout.com/admin/embed-widgets`). Every widget's signed
   URL and a ready-made `<iframe>` snippet live there with copy buttons.
2. In GHL (Maxxed Out location): **Dashboard → Edit → Add Widget → Custom Widget → iFrame**
   (on some plans it's "Custom HTML/iFrame").
3. Paste the widget URL (or the iframe snippet) and save. Use the suggested height
   shown on the admin page.

That's it — widgets auto-refresh their data every 5 minutes while visible.

## The widgets

| Widget | Path | What it shows | Data source |
|---|---|---|---|
| Revenue — All Rails | `/embed/revenue` | Blended gross/net, 30-day daily trend, recent transactions | Fanbasis API + GHL Payments API + Stripe enrollments |
| Revenue by Offer | `/embed/offers` | Gross/net/units/avg ticket per canonical offer | same as above |
| Medicaid 12-Week Cohort | `/embed/cohort` | Applications → called → booked → paid, tier mix, closer split, payment plans | `CohortApplication` / `CohortPayment` tables |
| Leads & Applications | `/embed/leads` | 30-day application volume, source mix, latest applicants | `Application` table |
| Webinar Funnel | `/embed/webinar` | Registrations, show-up %, VIP conversion, A/B test, upcoming sessions | webinar.maxxedout.com admin API |
| Funnel Traffic & Conversion | `/embed/funnels` | Views/visitors/CTA/checkout/enrollment for all `*.maxxedout.com` funnels | PostHog HogQL |
| GHL Pipelines | `/embed/pipelines` | Opportunities by pipeline, open value, purchased counts | GHL Opportunities API |
| GHL Appointments | `/embed/appointments` | Next-14-day calls + 30-day show rate across all GHL calendars | GHL Calendars API |
| Calendly — Rebecca | `/embed/bookings` | Booked/held/canceled + upcoming mentorship & Masterminds calls | Calendly API (Rebecca's PAT) |
| University Engagement | `/embed/students` | Students, enrollments, weekly actives, completion + quiz pass rates | `User`/`Enrollment`/`LessonProgress`/`QuizAttempt` |
| Contracts & E-Sign | `/embed/contracts` | Sent → viewed → signed funnel, outstanding contract value | `DocumentSignature` table |
| Checkout Links & Promos | `/embed/checkout-links` | Closer link funnel (sent→clicked→paid) + promo usage | `CheckoutLink`/`PromoCode` tables |

## Auth model

- Every `/embed/*` page is **public but key-gated**: it requires `?k=<32-hex>`
  where the key is `HMAC-SHA256(AUTH_SECRET, "embed-widget:<id>")` truncated to 32
  chars (see `src/lib/embed-auth.ts`).
- Keys are **stable** (no DB row, no expiry) so GHL dashboards never break, and
  **per-widget** so a leaked URL only exposes that one widget.
- Rotating `AUTH_SECRET` (or setting the optional `EMBED_WIDGET_SECRET` override)
  invalidates every embed URL at once — re-copy them from Admin → Embed Widgets.
- Treat widget URLs like passwords. They show revenue.
- Cross-site iframing works because these pages set no `X-Frame-Options` /
  `frame-ancestors`, use no cookies, and `/embed` is outside the auth middleware's
  protected routes. URLs must use `https://university.maxxedout.com` exactly —
  any other prod host 308-redirects (canonical-host rule in `src/middleware.ts`).

## Environment variables

All already in Vercel prod except the new one:

| Var | Status | Used by |
|---|---|---|
| `AUTH_SECRET` | existing | embed key derivation |
| `FANBASIS_API_KEY` (live) / `FANBASIS_REAL_KEY` | existing | revenue, offers |
| `GHL_API_KEY` (PIT) + `GHL_LOCATION_ID` | existing | pipelines, appointments, revenue |
| `WEBINAR_APP_URL` + `WEBINAR_ADMIN_TOKEN` | existing | webinar widget |
| `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` | existing | funnels widget |
| **`CALENDLY_API_TOKEN`** | **NEW — add to Vercel prod** (value in `.env.local`; it's Rebecca Nardi's PAT, originally from `university-funnel/.env.local`) | bookings widget |
| `EMBED_WIDGET_SECRET` | optional | overrides AUTH_SECRET for key derivation |

## Known data caveats

1. **Cohort widget shows 0 buyers / $0 collected** while Fanbasis clearly has
   cohort purchases. Cause: `FANBASIS_WEBHOOK_SECRET` is unset in prod so every
   Fanbasis webhook 500s and `CohortPayment` / `firstPaidAt` never populate
   (AUDIT_FINDINGS #6). Fix: set the secret in Vercel + run
   `scripts/register-fanbasis-webhook.ts`. Revenue widgets are unaffected — they
   read the Fanbasis transactions API directly.
2. **Test transactions are filtered**: anything with "test" in the product title
   or bought by `cj-miller@resurgence.cloud` is excluded from revenue
   (`src/lib/embed/offers.ts → isTestTransaction`).
3. **"Net to Todd"** is exact for Fanbasis (their API's `net_amount`); GHL/Stripe
   rails report gross because those processors' fees aren't itemized to us.
4. GHL + Calendly + Fanbasis responses are cached ~5 minutes server-side; a brand
   new sale can take up to 5 minutes to appear.
5. Offer bucketing (`src/lib/embed/offers.ts`) is heuristic on product titles —
   one-off custom deals (e.g. "Brian Johnson - 6k") bucket under Mentorship, and
   Fanbasis "Installment Payment" rows land in Other/Uncategorized.

## Code map

- `src/lib/embed-auth.ts` — key gen/verify
- `src/lib/embed/{ghl,calendly,webinar,revenue,offers,catalog,theme}.ts` — data layer
- `src/components/embed/*` — shell, stat tiles, bar lists, funnel, trend chart, table
- `src/app/embed/<id>/page.tsx` — the 13 widgets
- `src/app/(admin)/admin/embed-widgets/page.tsx` — URL listing page (staff only)
