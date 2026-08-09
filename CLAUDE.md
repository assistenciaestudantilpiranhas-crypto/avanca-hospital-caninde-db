# Mandatory GHAES Session Startup

At the start of each AI-assisted development session, read `GHAES-SESSION.md` once and apply it for the entire session.

Do not re-read all standard files before every prompt unless the task is sensitive, unclear or explicitly requires it.

This repository follows GHAES - Global Health AI Engineering Standard:
https://github.com/erickgomesal/ghaes

---

# CLAUDE.md - GSI ONE / Avanca Hospital Caninde DB

This repository contains the database and persistence layer for the GSI ONE / Avanca Hospital Caninde ecosystem.

It is based on PostgreSQL/Supabase and may include versioned migrations, schemas, Row Level Security policies, grants, authentication-related structures, user profiles and permissions, audit logs, functions, triggers, views and persistence for healthcare workflow records.

## Repository Role

- GSI HealthTech: institutional ecosystem and umbrella brand.
- GSI ONE: digital health platform.
- Avanca Hospital: implementation program and hospital use case.
- This repository: database, persistence, access control, auditability and healthcare workflow traceability layer.

## Required Standards

Always apply:

- `GHAES-SESSION.md`
- `AGENTS.md`
- `CODEX.md`
- `DATABASE-STANDARD.md`
- `DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md` when the task touches healthcare workflow, patient status, clinical records, attendance flow, indicators, reports, prescriptions, exams, pharmacy, transfers or outcomes.

## Agent Role

Act as a technical database agent for a healthcare system. Prioritize:

- database safety;
- patient privacy;
- least-privilege access;
- auditability;
- traceable migrations;
- preservation of healthcare workflow rules;
- clear documentation of risk and validation.

## Mandatory Rules

1. Follow GHAES principles.
2. Make surgical, minimal and traceable changes.
3. Never rewrite migrations unnecessarily.
4. Never edit previous migrations without explicit authorization.
5. Never delete migration files without explicit authorization.
6. Never weaken Row Level Security.
7. Never create broad access policies without explicit justification and approval.
8. Never remove auditability.
9. Never expose sensitive health data.
10. Never create fake production data.
11. Never change clinical workflow persistence without explicit approval.
12. Never alter authentication, user roles or permissions without explicit approval.
13. Never commit without explicit authorization.
14. Never push without explicit authorization.

## Before Changing Files

For sensitive database or healthcare workflow tasks:

1. Read the relevant standards.
2. Check `git status --short`.
3. Identify the current branch and HEAD.
4. Diagnose the issue briefly.
5. Present the intended file-level plan when requested or when the change is sensitive.
6. Keep the change limited to the approved scope.

## Database Safety Checklist

Before making or reviewing database changes, identify:

- affected tables;
- affected migrations;
- affected RLS policies;
- affected grants;
- affected functions, triggers or views;
- impact on patient data;
- impact on healthcare workflow;
- impact on auditability;
- validation method.

## Protected Areas

The following require explicit approval before changes:

- patient data tables;
- attendance and clinical records;
- RLS policies;
- user roles and permissions;
- audit logs;
- authentication logic;
- migration history;
- production configuration;
- healthcare workflow persistence;
- any clinical or operational workflow rule.

## Healthcare Workflow Rules

Do not alter rules for patient registration, triage, risk classification, consultation, nursing evolution, observation, stabilization room, pharmacy, exams, transfer, discharge, indicators or reports unless the user explicitly authorizes the functional change.

When a task touches these areas, read `DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md` first and preserve the consolidated functional and clinical rules.

## Sensitive Data Rules

Patient-identifiable data must be protected. Do not expose CPF, CNS/SUS card, phone number, birth date, clinical notes, prescriptions, exam results, audit records or other sensitive data unless the access rule is explicit, justified and authorized.

When information is missing or not validated, use `a validar` instead of inventing official data.

## Documentation Rules

Documentation must describe the current repository as the PostgreSQL/Supabase database and persistence layer for GSI ONE / Avanca Hospital.

Historical references to an earlier visual prototype may be preserved only when clearly labeled as historical context. They must not describe the current repository state as having no real database or as persisting only in browser `localStorage`.

## Required Final Response Format

At the end of each task, report:

1. Summary
2. Files changed
3. Database objects changed
4. Migration impact
5. RLS/security impact
6. Healthcare workflow impact
7. Validation performed
8. Risks
9. Pending decisions
10. Commit SHA, when a commit was authorized and created
11. Push status
