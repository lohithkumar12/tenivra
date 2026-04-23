# Startup Execution Plan — Day 1 Forward

**Founder & CEO:** Lohith Kumar  
**Product thesis:** A multi-tenant platform where businesses define their services; the product turns that into customer-facing automation (booking, messaging, AI-assisted flows).  
**How to use this doc:** Work phases in order. Each phase has exit criteria — do not skip validation before building heavy product.

---

## Guiding principles

1. **Narrow before wide** — One wedge (e.g. “service catalog → booking + one channel”) beats “everything for everyone.”  
2. **Revenue signal early** — Talk to buyers and get intent to pay before perfect code.  
3. **Services are source of truth** — Structured data first; AI layers sit on top, not instead of logic.  
4. **Weekly rhythm** — Set 1–3 priorities per week; review metrics and learnings every Friday.

---

## Phase 0 — Foundation (Weeks 1–2)

**Goal:** Decide what you are building *for whom*, under what name, and how you will operate legally and financially at a minimal level.

| Step | Action | Output |
|------|--------|--------|
| 0.1 | Write a **one-page thesis**: problem, who pays, why now, why you | 1-pager |
| 0.2 | Pick **initial ICP** (ideal customer profile): one segment only (e.g. independent clinics *or* boutique gyms — not both at first) | ICP paragraph |
| 0.3 | **Name** + domain check + social handles (even if placeholder) | Shortlist + chosen name |
| 0.4 | **Incorporation / structure** (local advice): entity, basic banking, accounting habit | Entity + bank account |
| 0.5 | **IP hygiene**: who owns code, contractors agreements template | `IP_HYGIENE.md` |
| 0.6 | **Cap table** (even if 100% you): simple spreadsheet | `CAP_TABLE_V0.md` |

**0.4 timing (bootstrap):** You may defer choosing the **legal entity** and opening a **business bank account** until the **MVP is in progress or shipped**, if you are only building and not yet taking money as Tenivra. Complete **0.4 before** the first of: **customer payment**, **invoicing under the business name**, or **signing material contracts** as the company — whichever comes first. Use **local** accountant/lawyer advice when you formalize structure.

**Exit criteria:** You can explain the company in 30 seconds; ICP is written; you can invoice or accept payment legally when ready (with **0.4** done before first business revenue or formal contracts, per the note above).

---

## Phase 1 — Discovery & validation (Weeks 2–6)

**Goal:** Prove that real businesses will **pay** for the outcome, not just like the idea.

| Step | Action | Output |
|------|--------|--------|
| 1.1 | List **30–50** potential ICP contacts (LinkedIn, referrals, local directories) | CRM sheet |
| 1.2 | Run **20+ discovery calls** (not sales pitches): current workflow, tools, pain, budget | Call notes |
| 1.3 | Define **MVP outcome** in one sentence (e.g. “Book appointments from a link using *their* services list”) | MVP sentence |
| 1.4 | **Prototype**: Figma, clickable demo, or concierge (you + spreadsheet + manual steps) | Demo or playbook |
| 1.5 | **LOI or prepayment**: aim for 3–5 serious signals (signed LOI, deposit, or firm pilot commitment) | Pipeline doc |

**Exit criteria:** Clear repeated pain + willingness to pay or pilot; MVP scope is *cut* to match that pain.

---

## Phase 2 — MVP specification & build (Weeks 6–14, length varies)

**Goal:** Ship something **small** that delivers the promised outcome for the ICP.

| Step | Action | Output |
|------|--------|--------|
| 2.1 | **PRD / spec**: user stories for tenant onboarding, service CRUD, one customer journey end-to-end | PRD v1 |
| 2.2 | **Architecture sketch**: multi-tenancy, auth, data model (services, availability, bookings) | Diagram + doc |
| 2.3 | **Tech choices**: stack, hosting, DB, auth provider — document *why* | ADR or short rationale |
| 2.4 | **Build MVP**: internal alpha → 1–3 design partners | Working product |
| 2.5 | **Observability**: basic logs, error tracking, simple analytics events | Dashboards |
| 2.6 | **Security baseline**: HTTPS, secrets handling, tenant isolation checks | Checklist |

**Exit criteria:** Design partners complete real workflows without you doing the work manually.

---

## Phase 3 — Pilot launch & iteration (Weeks 12–20)

**Goal:** Convert pilots to **paid** customers and harden the product.

| Step | Action | Output |
|------|--------|--------|
| 3.1 | **Pricing v1**: simple tiers or flat pilot fee + success criteria | Price sheet |
| 3.2 | **Onboarding playbook**: checklist + video or doc for new tenants | Playbook |
| 3.3 | **Support channel**: email/Slack with SLA you can keep | Process |
| 3.4 | **Weekly product reviews** with pilots: bugs, requests, prioritization | Backlog |
| 3.5 | **Case study draft** (even internal): before/after metrics | 1-pager |

**Exit criteria:** Paying customers (even small MRR) + repeatable onboarding without custom engineering per client.

---

## Phase 4 — Go-to-market & growth (Months 6–12)

**Goal:** Repeatable **acquisition** and **retention**, not one-off heroics.

| Step | Action | Output |
|------|--------|--------|
| 4.1 | **Positioning**: website, messaging, comparison to alternatives | Site v1 |
| 4.2 | **Outbound / inbound** system: content, partnerships, or outbound sequence | Pipeline metrics |
| 4.3 | **Product roadmap** post-MVP: second vertical *or* deeper features — choose one | Roadmap |
| 4.4 | **Hiring plan**: first hire (often eng or CS) tied to revenue milestone | Plan |
| 4.5 | **Fundraising optional**: only if speed requires it; otherwise bootstrap to proof | Decision memo |

**Exit criteria:** Predictable funnel metrics (leads → trials → paid) and churn you understand.

---

## Phase 5 — Scale & platform (Year 2+)

**Goal:** Platform depth, compliance where needed, partnerships, and team scale.

- Deeper **integrations** (payments, calendars, CRM, WhatsApp Business API).  
- **Compliance** (e.g. health or regional data rules) if ICP requires it.  
- **Enterprise** features: SSO, audit logs, SLAs — only when deals demand it.

**Exit criteria:** Unit economics and retention support scaling spend and headcount.

---

## CEO cadence (repeat every week)

| When | Activity |
|------|----------|
| Monday | 1–3 priorities for the week; unblock build or GTM |
| Mid-week | Customer or prospect touchpoints (minimum viable) |
| Friday | Review: what shipped, what was learned, next week’s bets |

**Metrics to track from Phase 3 onward (pick a few):**  
Activation (tenant completes setup), time-to-first-booking (or core action), weekly active tenants, MRR, churn, support tickets per tenant.

---

## Risk register (keep visible)

| Risk | Mitigation |
|------|------------|
| Scope creep (“all industries, full AI”) | Written MVP sentence; say no in roadmap |
| Building before validation | Phase 1 exit criteria before full Phase 2 build |
| No tenant isolation | Architecture review before multi-customer data |
| Founder burnout | Weekly priorities cap; delegate or cut scope |

---

## Document control

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Last updated | 2026-04-06 |
| Owner | Lohith Kumar, Founder & CEO |

*Revise this plan after Phase 1 discovery — your ICP and MVP sentence should drive all later phases.*
