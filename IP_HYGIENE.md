# IP hygiene — Tenivra (Phase 0.5)

This section is **important**: clear ownership of code, designs, and workflows avoids disputes later and satisfies diligence if you raise money or sell the company.

---

## Ownership (engineering)

- **Source of truth:** All **LangGraph** nodes, **custom RAG** logic, application code, infra-as-code, and internal tooling should live in **Tenivra-controlled GitHub repositories** (org or repo owned by the company / founder on behalf of the company).
- **Commits:** Work product should be **committed regularly** so history shows what the company built and when.
- **Do not** leave core product logic only on personal machines or third-party accounts without a path to company ownership.

---

## Contracting (example: Tenant Dashboard)

If you hire anyone to build the **Tenant Dashboard** (the UI where businesses enter their information):

- Use a **standard agreement** that includes an **IP assignment** (or work-for-hire, per your jurisdiction) clause so **Tenivra owns** the deliverables — including UI, components, and integrated front-end code.
- Pair it with **confidentiality** and clear **deliverables / acceptance** language.

*Template agreements should be reviewed by a lawyer in your jurisdiction.*

---

## Simple policy (company default)

**All code, designs, prompts, workflows, documents, and product assets created for the company are owned by the company.** Any contractor, freelancer, or collaborator must sign an agreement **assigning IP to the company** and **confirming confidentiality**.

---

## Minimum documents to have

| Item | Purpose |
|------|--------|
| **Founder → company IP assignment** | Confirms work you did before/during incorporation is owned by the entity once it exists (timing depends on local law). |
| **Contractor / freelancer agreement** | Work-for-hire or **IP assignment**, **confidentiality**, **no reuse** of Tenivra’s confidential business logic for others, **payment** terms. |
| **Basic NDA template** | For advisors, early hires, or partners before deep disclosure. |
| **Open-source usage policy** | Keep a **license list**; do **not** paste proprietary code from employers or clients; **track** third-party packages used in the product. |

---

## Why this matters

If you **raise money** or **sell** the product, investors and buyers will ask whether the **company clearly owns** the codebase, product IP, and key integrations — not individual contributors or unnamed third parties.

---

## Document control

| Field | Value |
|-------|--------|
| Owner | Lohith Kumar, Founder & CEO |
| Review | Before first contractor engagement; again before external funding conversations |

*This file is operational guidance, not legal advice.*
