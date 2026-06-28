# DATABASE-STANDARD.md — GSI ONE / Avança Hospital Database Standard

This document defines database rules for the Avança Hospital Canindé DB repository.

This repository follows GHAES — Global Health AI Engineering Standard.

Reference:
https://github.com/erickgomesal/ghaes

## 1. Database Role

The database is the persistence and auditability layer of GSI ONE.

It must preserve:

- data integrity;
- healthcare workflow traceability;
- patient privacy;
- access control;
- audit logs;
- reliable indicators.

## 2. Migration Rules

- Prefer creating new migrations over editing old migrations.
- One migration should have one clear purpose.
- Migration names must describe the real change.
- Avoid destructive operations unless explicitly approved.
- Document impact when changing patient, clinical or audit data.
- Do not delete migration history.
- Do not rewrite migration history without explicit authorization.

## 3. RLS Rules

- RLS must remain enabled for sensitive tables.
- Policies must follow least privilege.
- Do not create broad access policies.
- Do not use permissive shortcuts without justification.
- Test access assumptions whenever possible.
- Never weaken security to make a feature easier to implement.

## 4. Auditability Rules

The database must preserve traceability for:

- inserts;
- updates;
- deletes;
- user actions;
- patient records;
- attendance flow;
- clinical records;
- prescriptions;
- exams;
- transfers;
- discharge.

## 5. Healthcare Workflow Rules

Changes must not break or silently alter:

- patient registration;
- triage;
- risk classification;
- consultation;
- nursing evolution;
- observation;
- stabilization room;
- pharmacy;
- exams;
- transfer;
- discharge;
- indicators.

Any change affecting healthcare workflow must be explicit, justified and traceable.

## 6. Sensitive Data Rules

Patient-identifiable data must be protected.

Do not expose:

- CPF;
- CNS/SUS card;
- phone number;
- birth date;
- clinical notes;
- prescriptions;
- exam results;
- audit records;

unless the access rule is explicit and justified.

## 7. Validation Checklist

Before delivery, verify:

- migration syntax;
- table impact;
- RLS impact;
- audit impact;
- healthcare workflow impact;
- backward compatibility with the front end;
- documentation needs.

## 8. Commit and Push

No commit or push may be performed without explicit authorization.

Commit authorization and push authorization are separate.
