# Owner Console & PMS — Implementation Plan

**Project:** Royal Mansion Resort Villa
**Status:** Proposed — awaiting owner sign-off before Phase 0
**Scope decision (from owner):** Multi-property · Core console (bookings, payments, calendar blocks, packages, reports) + Front desk & housekeeping + Rate & availability manager + Guest communication + Reporting & analytics
**Out of scope for now:** Channel manager (Airbnb/Booking.com sync), full multi-language CMS

---

## 1. Executive summary

The booking engine already ships a secure admin foundation: signed HTTP-only session cookies, bcrypt passwords, role-based middleware (`OWNER`/`MANAGER`/`STAFF`), a `requireRole` guard, audit logging, and six read-only + one write admin endpoint. What is missing is the **product**: a usable Owner Console with booking management actions, payment verification, a calendar to block dates, editors for packages and rates, housekeeping, guest communication, and reports.

This plan turns that foundation into a full PMS in six incremental phases. It keeps the existing architecture (Next.js app + Express API + Prisma), extends the data model with housekeeping and communication tables, enforces **multi-property scoping**, and hardens the security model (CSRF, login throttling, property-level permissions).

---

## 2. Current state assessment

### What already exists (verified in code)

| Area | Detail |
|---|---|
| Admin auth | `POST /admin/auth/login`, `GET /admin/auth/me`, `POST /admin/auth/logout`; signed HTTP-only `rmv_admin_session` cookie; SHA-256 token hashes in `AdminSession`; `lastSeenAt` refresh; audit log on login success/failure |
| Authorization | `requireAdmin` + `requireRole` middleware (`auth.ts`); roles `OWNER`, `MANAGER`, `STAFF` |
| Admin API (read) | Six GET endpoints: `/admin/dashboard`, `/admin/bookings`, `/admin/packages`, `/admin/calendar`, `/admin/payments`, `/admin/reports` |
| Admin API (write) | `POST /admin/availability-blocks` only |
| Services layer | `adminService.ts`, `bookingService.ts`, `availabilityService.ts`, `pricingService.ts`, `calendarService.ts` — DB logic already kept out of routes ✅ |
| Schema | `Property`, `Unit`, `Package`, `SeasonalRate`, `DateRateOverride`, `AddOn`, `Coupon`, `Guest`, `Booking`, `BookingAddOn`, `BookingPriceLine`, `Payment`, `PaymentEvent`, `AvailabilityBlock`, `AdminUser`, `AuditLog`, `NotificationLog`, `AdminSession` |
| Frontend | Single `/admin` page: login form + 4 stat cards + arrivals table |
| Tests | Integration suite for admin auth (`admin-auth.test.ts`); unit tests for dates/money/references |
| Hardening | `helmet`, `express-rate-limit` (global 120/min), `cookie-parser` signed cookies, Zod body validation, pino-http logging |

### Gaps this plan closes

1. **No console shell** — no sidebar navigation, no per-resource pages, no layout for authenticated area.
2. **No booking actions** — cannot confirm, cancel, check in/out, edit notes, or create manual bookings from the UI.
3. **No payment workflows** — bank transfers cannot be verified, cash/refunds cannot be recorded; payment detail view missing.
4. **No rate/availability editor** — seasonal rates and date overrides exist in schema but have no admin CRUD or calendar UI.
5. **No housekeeping / front desk** — no room-status tracking, cleaning tasks, or stay check-in/check-out timestamps.
6. **No guest communication** — `NotificationLog` exists but there is no template manager or send flow.
7. **Reports are minimal** — one status group-by; no revenue-by-month, occupancy, source mix, or CSV export.
8. **Multi-property not enforced** — every admin query returns all properties; no per-admin property scoping.
9. **CSRF exposure** — production cookies use `SameSite=None`; needs origin checking / double-submit token.

---

## 3. Goals and non-goals

### Goals
- A secure, fast, mobile-tolerant Owner Console for day-to-day property operations.
- Every existing read endpoint gets a matching action workflow (confirm, cancel, verify payment, block dates).
- Multi-property ready: admins see only properties they are assigned to (OWNER sees all).
- Every mutation is audited and role-gated.
- Reports answer: revenue, occupancy, booking mix, daily rates — exportable to CSV.

### Non-goals (explicit)
- No channel-manager/OTA sync in this plan.
- No public-facing redesign; the console reuses the existing design language.
- No PCI scope — card data never touches our servers (PayHere handles it).

---

## 4. Architecture principles (applied from the software-architecture skill)

1. **Clean layering:** `routes (HTTP) → services (use cases) → prisma (infrastructure)`. Routes stay thin; business rules live in services; no `prisma.` calls inside React components.
2. **Domain naming:** modules named after the domain — `HousekeepingService`, `RateManagerService`, `PaymentVerificationService`, `CommunicationService` — never `utils.ts` dumping grounds.
3. **Early returns + small units:** functions ≤50 lines, files ≤200 lines, max 3 nesting levels.
4. **Library-first:** use established libraries for tables, charts, forms, and validation rather than hand-rolling (see §11).
5. **One source of truth:** all business rules (status transitions, price recalculation, availability overlap) live in services and are covered by unit tests — never duplicated in UI logic.

---

## 5. Target architecture

### 5.1 App layout (unchanged monorepo, extended)

```
apps/api/src/
  routes/            # thin HTTP layer, validation, auth guards
    adminRoutes.ts           # extended: bookings, packages, rates, blocks, payments, guests
    adminHousekeepingRoutes.ts  # new
    adminCommunicationRoutes.ts # new
    adminReportRoutes.ts        # new (or split from adminRoutes)
  services/
    adminService.ts            # existing — extended
    bookingAdminService.ts     # new: confirm/cancel/check-in/create-manual
    paymentAdminService.ts     # new: verify bank transfer, record cash, refund
    rateManagerService.ts      # new: seasonal rates + date overrides + bulk apply
    housekeepingService.ts     # new
    communicationService.ts    # new: templates + send + log
    reportService.ts           # new: aggregations + CSV
  middleware/
    auth.ts                    # extended: requirePropertyAccess
src/app/
  admin/
    layout.tsx                 # NEW: auth guard + console shell (sidebar + topbar)
    page.tsx                   # dashboard (existing page becomes /admin/dashboard)
    (console)/
      bookings/                # list + filters + pagination
      bookings/[id]/           # detail + action panel
      bookings/new/            # manual booking wizard
      calendar/                # month grid: bookings + blocks per unit
      packages/                # package list
      packages/[id]/           # editor: details, images, amenities, rates tab
      rates/                   # rate calendar editor
      payments/                # list + verify/refund actions
      housekeeping/            # task board + unit status
      guests/                  # guest directory
      communication/           # templates + send history
      reports/                 # charts + tables + CSV export
      settings/                # property settings, team members
      audit/                   # audit log viewer
```

### 5.2 Backend layering contract

```
HTTP route            -> validate (Zod) + guard (requireAdmin / requirePropertyAccess / requireRole)
    ↓
Service (use case)    -> all business rules, transaction boundaries, audit writes
    ↓
Prisma repository     -> single data-access point (prisma client passed in, testable)
```

- Services take `prisma` as a parameter (existing convention in `adminService.ts`) — keeps them unit-testable with mocks.
- State transitions for bookings are **centralized** in `bookingAdminService` with a small transition map (see §7) so UI and API can never diverge.

### 5.3 Multi-property model

New table **`AdminPropertyAssignment`** (or `StaffPropertyScope`):

```
model AdminPropertyAssignment {
  adminUserId String
  propertyId  String
  role        AdminRole  // override role per property (optional)
  @@id([adminUserId, propertyId])
}
```

- `OWNER` → implicit access to **all** properties (no rows required).
- `MANAGER` / `STAFF` → access only to rows they are assigned.
- New middleware `requirePropertyAccess(propertyId)` (or a `parsePropertyScope()` helper used by list endpoints) resolves the set of accessible `propertyId`s once per request and injects them into the query:
  - List endpoints: `where: { propertyId: { in: accessibleIds } }`
  - Detail/mutation endpoints: verify `req.params.id`'s property is in the accessible set (or the admin is OWNER).
- Admin UI shows a **property switcher** in the topbar; selection is stored in a cookie (`rmv_active_property`) and sent as `?propertyId=`.

### 5.4 Security model (hardened)

| Control | Implementation |
|---|---|
| Session | Keep existing signed cookie + `AdminSession` row (sessions already hard-expire after 7 days via `ADMIN_SESSION_DAYS`). Optionally add a *shorter* idle timeout — e.g. revoke sessions whose `lastSeenAt` is older than 2 hours (checked in `requireAdmin`) — for tighter staff-session hygiene. |
| CSRF | Production uses `SameSite=None`. Add an **Origin/Host check middleware** on all admin mutations (reject if `Origin` not in allowlist), plus optional double-submit token. |
| Login throttling | Per-IP + per-email rate limit on `/admin/auth/login` (e.g. 5/min) using `express-rate-limit` (already a dependency). |
| Roles | `requireRole(["OWNER","MANAGER"])` on destructive actions (cancel, refund, delete); `OWNER` only for team management and settings. |
| Audit | Every mutation writes `AuditLog` with `oldValues`/`newValues` (already the pattern in `adminAuthRoutes`). Add `action` naming convention: `BOOKING_CONFIRMED`, `PAYMENT_VERIFIED`, `BLOCK_CREATED`, `RATE_UPDATED`, `HOUSEKEEPING_STATUS_CHANGED`, etc. |
| Password | Seed owner changes default password; add `POST /admin/auth/change-password`; team admins get `ADMIN_SEED_*`-style env or first-login reset flow. |

---

## 6. Data model changes (new Prisma migration)

```prisma
// 1. Booking — front desk timestamps
actualCheckInAt  DateTime?
actualCheckOutAt DateTime?

// 2. AdminPropertyAssignment — multi-property scoping (see 5.3)

// 3. HousekeepingTask
model HousekeepingTask {
  id            String        @id @default(cuid())
  unitId        String
  propertyId    String
  status        HousekeepingStatus @default(CLEANING)
  // CLEANING, CLEAN, INSPECTED, OUT_OF_ORDER, MAINTENANCE
  assignedToId  String?       // AdminUser
  scheduledDate DateTime?     @db.Date
  notes         String?       @db.Text
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  @@index([unitId, scheduledDate])
}

// 4. CommunicationTemplate
model CommunicationTemplate {
  id         String   @id @default(cuid())
  propertyId String?
  name       String   // BOOKING_CONFIRMED, REMINDER, CUSTOM, ...
  subject    String
  body       String   @db.Text  // supports {guestName} {reference} placeholders
  channel    String   @default("EMAIL") // EMAIL | WHATSAPP
  active     Boolean  @default(true)
}

// 5. NotificationLog (existing table) — extended with send columns
// + templateId, channel, subject, body, sentAt (see decision below)
```

> **Decision (outbox):** no new `MessageOutbox` table — **extend the existing `NotificationLog`** with `templateId`, `channel`, `subject`, `body`, and `sentAt` columns in the Phase 4 migration. One outbox table, no duplication.

### Suggested migration order
1. **Phase 2 migration:** `AdminPropertyAssignment` (needed early for scoping).
2. **Phase 3 migration:** Booking `actualCheckInAt`/`actualCheckOutAt` + `HousekeepingTask`.
3. **Phase 4 migration:** `CommunicationTemplate` + `NotificationLog` extensions (columns only).

Each migration is small and reversible; run with `npm run db:migrate`.

---

## 7. API endpoint catalog (new admin surface)

All under `/api/v1/admin`, all guarded. `P` = property-scoped, `R` = role-restricted.

### Bookings
| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/admin/bookings` | Paginated list + filters (status, propertyId, date range, search) | P |
| GET | `/admin/bookings/:id` | Detail: guest, payments, price lines, add-ons, audit trail | P |
| POST | `/admin/bookings` | Create manual booking (reuses `calculateQuote` + availability check) | P |
| PATCH | `/admin/bookings/:id` | Edit guest/dates/notes (re-prices if dates change) | P |
| POST | `/admin/bookings/:id/confirm` | HOLD/PENDING_PAYMENT → CONFIRMED (bank-transfer verified path) | P |
| POST | `/admin/bookings/:id/cancel` | → CANCELLED + reason; optional refund note | P, R(OWNER/MANAGER) |
| POST | `/admin/bookings/:id/check-in` | Set `actualCheckInAt`, status → COMPLETED/IN_HOUSE semantics | P |
| POST | `/admin/bookings/:id/check-out` | Set `actualCheckOutAt` | P |

**Centralized status transition map (in `bookingAdminService`):**

```
HOLD             -> { CONFIRMED (owner override), CANCELLED }
PENDING_PAYMENT  -> { CONFIRMED (payment verified), CANCELLED, EXPIRED (cron) }
PAYMENT_PROCESSING -> { CONFIRMED, CANCELLED }
CONFIRMED        -> { COMPLETED (check-out), CANCELLED, NO_SHOW }
COMPLETED        -> { }
```

> **Decision (check-in semantics):** `BookingStatus` has **no `IN_HOUSE` value**. v1 keeps the status at `CONFIRMED` while in-house and records only `actualCheckInAt` / `actualCheckOutAt` (timestamps carry the front-desk state). If the owner wants a visible in-house state on dashboards, add an `IN_HOUSE` enum value in the Phase 3 migration — decide at that phase, not implicitly.

### Payments
| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/admin/payments` | Paginated list + filters (status, provider, booking) | P |
| GET | `/admin/payments/:id` | Detail incl. `PaymentEvent` history | P |
| POST | `/admin/payments/:id/verify` | Mark bank-transfer payment verified → updates booking `amountPaid`/`paymentStatus` | P, R |

> **Note:** `createBookingHold` always creates a `PAYHERE`/`UNPAID` payment row (amount = deposit), and `/payments/bank-transfer` never creates its own row. The verify/manual-payment flow must either update that hold-created row (set provider → `BANK_TRANSFER`, `verified = true`, actual amount) or create a new `BANK_TRANSFER` payment and mark the hold row `FAILED` — otherwise a verified bank-transfer booking is left with a misleading `PAYHERE UNPAID` payment.
| POST | `/admin/payments` | Record manual payment (CASH / verified BANK_TRANSFER) with idempotency key | P |
| POST | `/admin/payments/:id/refund` | Refund note + status change (no live PayHere refund call in v1) | P, R(OWNER/MANAGER) |

**Rule (from ADMIN_GUIDE.md):** never edit verified PayHere amounts manually; `verify` only for `BANK_TRANSFER` / `CASH` records.

### Packages & rates
| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/admin/packages` | Existing (extend with property filter + pagination) | P |
| POST | `/admin/packages` | Create package | P |
| PATCH | `/admin/packages/:id` | Edit package (pricing, images, amenities, terms) | P |
| DELETE | `/admin/packages/:id` | Soft-deactivate (`active=false`) — never hard delete with bookings | P, R |
| GET | `/admin/rates/:packageId` | Seasonal rates + overrides for a package | P |
| POST | `/admin/rates/:packageId/seasonal` | Create/update seasonal rate | P |
| POST | `/admin/rates/:packageId/overrides` | Bulk apply date overrides (price/closed/closedToArrival) | P |
| DELETE | `/admin/rates/seasonal/:id` | Delete seasonal rate | P |
| DELETE | `/admin/rates/overrides/:id` | Delete date override | P |

### Calendar & blocks
| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/admin/calendar` | Existing (extend: property filter, month range, per-unit) | P |
| POST | `/admin/availability-blocks` | Existing | P |
| PATCH | `/admin/availability-blocks/:id` | Edit block | P |
| DELETE | `/admin/availability-blocks/:id` | Remove block | P |

### Housekeeping & front desk
| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/admin/housekeeping` | Task board for date/property (units + status + tasks) | P |
| POST | `/admin/housekeeping/tasks` | Create task | P |
| PATCH | `/admin/housekeeping/tasks/:id` | Update status/assignee/notes | P |
| DELETE | `/admin/housekeeping/tasks/:id` | Delete task | P |

### Guests
| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/admin/guests` | Searchable directory (email/phone/name) | P |
| GET | `/admin/guests/:id` | Guest detail + booking history | P |

### Communication
| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/admin/communication/templates` | List templates | P |
| POST | `/admin/communication/templates` | Create/update template | P, R |
| POST | `/admin/communication/send` | Send via channel; validates placeholders; writes outbox + `NotificationLog` | P, R |

### Reports
| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/admin/reports` | Existing status report (keep) | P |
| GET | `/admin/reports/revenue` | Revenue by month/year + by package + by source; CSV via `?format=csv` | P |
| GET | `/admin/reports/occupancy` | Occupancy % per unit/month (nights sold / available nights) | P |
| GET | `/admin/reports/export` | Full CSV export (bookings, payments) | P, R |

### Team & settings
| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET/POST | `/admin/team` | List / invite staff | OWNER |
| PATCH | `/admin/team/:id` | Role, active, property assignments | OWNER |
| PATCH | `/admin/properties/:id` | Property settings (tax %, check-in/out times, bank instructions) | OWNER |
| GET | `/admin/audit` | Audit log viewer (filter by entity/action/admin) | OWNER/MANAGER |

---

## 8. UI/UX design

### 8.1 Console shell
- `src/app/admin/layout.tsx`: server component checks session cookie via a lightweight API call to `/admin/auth/me`; unauthenticated → redirect to `/admin/login`. Client shell with:
  - **Sidebar** (collapsible, icon + label): Dashboard, Bookings, Calendar, Packages & Rates, Payments, Housekeeping, Guests, Communication, Reports, Settings, Audit log.
  - **Topbar**: property switcher (multi-property), signed-in admin chip, logout.
- Reuse existing design tokens (`primary`, `ivory`, `surface`, typography tokens) from `tailwind.config.ts` for visual consistency, but the console uses a denser, more utilitarian layout than the marketing site.

### 8.2 Page patterns
- **Dashboard:** KPI cards (bookings, revenue, paid, upcoming arrivals) + today's check-ins/check-outs + occupancy snapshot + recent payments. Reuses `getDashboardSummary`, extended.
- **Bookings list:** filter bar (status tabs, date range, search) + TanStack Table with pagination; row click → detail.
- **Booking detail:** header with status badge + action bar (Confirm / Cancel / Check-in / Check-out); tabs: Overview, Payments, Guest, Timeline (from AuditLog).
- **Calendar:** month grid per unit — colored spans for bookings (status color) and blocks (hatched); click empty day → new block modal; drag/resize blocks.
- **Packages & Rates:** package cards → editor; Rates tab shows monthly calendar with overrides; bulk-apply modal for date ranges.
- **Housekeeping:** kanban-style board (`CLEANING → CLEAN → INSPECTED`) filtered by date; unit status chips; assignee avatars.
- **Reports:** line/bar charts (Recharts) + tables; `Export CSV` buttons calling `?format=csv`.
- **Communication:** template list + editor with `{placeholder}` helper; send modal with preview; outbox history with status.

### 8.3 Forms & validation
- React Hook Form + Zod schemas shared conceptually with API validation (client-side mirrors of server schemas).
- Consistent loading/error/empty states; optimistic updates only for trivial toggles (housekeeping status) with rollback.

---

## 9. Implementation phases

### Phase 0 — Console foundation (smallest shippable shell)
- [ ] `AdminPropertyAssignment` model + migration + `requirePropertyAccess` middleware.
- [ ] `admin/layout.tsx` shell: auth guard, sidebar, topbar, property switcher.
- [ ] Move current `/admin` content to `/admin/dashboard`; add `/admin/login` page.
- [ ] Shared admin components: `DataTable`, `StatusBadge`, `Modal`, `ConfirmDialog`, `PageHeader`, `Card`, `Toast`.
- [ ] CSRF origin check middleware + login rate limit.
- [ ] `GET /admin/bookings` extended with pagination + filters.
- **Exit criteria:** login → sidebar → dashboard with filtered bookings; unauthenticated users redirected.

### Phase 1 — Core Owner Console (bookings, payments, blocks, packages)
- [ ] Booking actions: confirm, cancel (+reason), notes edit, manual booking creation (reuses quote + availability).
- [ ] Booking detail page with timeline from AuditLog.
- [ ] Payment workflows: verify bank transfer, record cash payment, refund note; booking `amountPaid` recalc in `paymentAdminService`.
- [ ] Calendar page: month grid with bookings + blocks; create/edit/delete blocks.
- [ ] Package editor: details, images, amenities, active toggle.
- [ ] Audit log viewer.
- **Exit criteria:** full booking lifecycle manageable from the console; every action writes AuditLog; bank-transfer verify moves a booking PENDING_PAYMENT → CONFIRMED.

### Phase 2 — Rate & availability manager
- [ ] Rate editor UI (seasonal rates + date overrides) wired to `rateManagerService`.
- [ ] Bulk apply overrides for date ranges; closed / closed-to-arrival / closed-to-departure toggles.
- [ ] Package editor Rates tab.
- [ ] Normalize all date handling through the existing `dates.ts` helpers — date-only fields are stored as `T00:00:00.000Z`, and Asia/Colombo is UTC+5:30, so naive date math can shift a day. Add date-boundary tests.
- [ ] Re-run pricing unit tests + add rate-override precedence tests (override > seasonal > base).
- **Exit criteria:** owner can block dates and set prices for any range; changes reflect in `/quotes` immediately.

### Phase 3 — Front desk & housekeeping
- [ ] Migration: `actualCheckInAt`/`actualCheckOutAt` + `HousekeepingTask`.
- [ ] Check-in / check-out actions on booking detail + today board.
- [ ] Housekeeping board + unit status + task CRUD + assignee.
- [ ] Guest directory (search + history).
- **Exit criteria:** daily front-desk flow (arrivals → check-in → housekeeping clean → check-out) fully supported.

### Phase 4 — Guest communication
- [ ] Migration: `CommunicationTemplate` + extend `NotificationLog`.
- [ ] Template manager with placeholder validation.
- [ ] Send email via Resend (env `RESEND_API_KEY` already declared); WhatsApp behind a provider decision (Twilio / WhatsApp Cloud API — evaluate, do not assume).
- [ ] Booking-confirmed + pre-arrival reminder triggers; outbox history.
- **Exit criteria:** owner sends a confirmation email from a booking with correct placeholders; log shows SENT + provider id.

### Phase 5 — Reporting & analytics
- [ ] Revenue by month/package/source; occupancy %; daily rate summaries.
- [ ] CSV export endpoint + download buttons.
- [ ] Dashboard enhancements (charts, occupancy snapshot).
- **Exit criteria:** monthly P&L-style report exportable; numbers reconcile with `BookingPriceLine` sum tests.

---

## 10. Testing strategy

| Level | What | Tooling |
|---|---|---|
| Unit | Status transition map, payment recalc, rate precedence, availability overlap, placeholder rendering | vitest (existing) |
| Integration | New admin endpoints: auth guard, property scoping (admin A cannot see property B), verify-payment flow, confirm/cancel transitions, CSRF rejection | supertest + mocked prisma (existing pattern in `admin-auth.test.ts`) |
| E2E | Login → navigate → confirm booking → verify payment → block date → housekeeping update (happy path) | Playwright (already configured `test:e2e`) |

- Every service gets unit tests before UI wiring (services are the source of truth).
- Add a `scripts/db:reset-demo` or seed extension with a multi-property + staff fixtures so QA can test scoping.

---

## 11. Libraries to add (library-first — no hand-rolled equivalents)

| Need | Library | Why |
|---|---|---|
| Data tables | TanStack Table (`@tanstack/react-table`) | Sorting/filtering/pagination for bookings, payments, guests |
| Charts | Recharts | Revenue/occupancy reports |
| Forms | React Hook Form + existing Zod | Validation + server parity |
| Date pickers / range | `react-day-picker` | Booking filters, rate editor |
| Calendar grid | Evaluate `react-big-calendar` vs custom month grid | Villa inventory is per-unit; a custom grid may fit better — spike in Phase 1 |
| Toast/confirm | `sonner` + small `ConfirmDialog` | UX consistency |
| Email | Resend (already in env) | Transactional + reminder emails |
| WhatsApp | Twilio or WhatsApp Cloud API — **evaluate via research before integrating** | Guest communication channel |
| CSV | `csv-stringify` (or build with `String.escape` — tiny) | Report export |

> Rule: do **not** write custom table sorting, chart rendering, or date math when these libraries exist and are maintained. Revisit the list at each phase start.

---

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Booking state drift (UI does something service forbids) | Data corruption | Centralized transition map in service + unit tests; UI only calls endpoints |
| Multi-property data leak | Compliance/reputation | `requirePropertyAccess` on every admin route; integration test proving cross-property access fails |
| CSRF on cross-origin cookie auth | Account takeover | Origin check middleware + login throttle (Phase 0) |
| Rate changes not reflected in quotes | Revenue errors | Rate precedence tests; `/quotes` recomputes from DB each call (already true) |
| PayHere refund complexity | Financial risk | v1 = recorded refund notes + status only; no live refund call until scoped separately |
| Scope creep (channel manager) | Delays | Explicitly out of scope; revisit after Phase 5 |

---

## 13. Open questions for the owner

1. **Team structure:** How many staff will use the console? (drives role granularity — is `STAFF` per-property or per-function?)
2. **Front-desk stay semantics:** Is a booking "in-house" between check-in and check-out, or do we just record timestamps? (affects status model)
3. **WhatsApp vs email priority:** Which channel matters more for guest communication in Phase 4?
4. **Reports horizon:** Monthly P&L vs. per-booking profitability — which is the priority report?
5. **Refunds:** Does the owner need live PayHere refunds in v1, or is "mark refunded + note" acceptable?

---

## 14. Definition of done (overall)

- [ ] Owner and staff can complete the full booking lifecycle without touching code or DB.
- [ ] Every admin mutation is authenticated, authorized (role + property), and audited.
- [ ] Multi-property scoping enforced and integration-tested.
- [ ] Reports reconcile with booking price lines.
- [ ] `npm run typecheck`, `npm run test`, and `npm run test:e2e` pass.
- [ ] Updated `ADMIN_GUIDE.md` documents all console workflows.

---

*Plan generated as a design document — no production code was changed. Implementation starts at Phase 0 after sign-off.*
