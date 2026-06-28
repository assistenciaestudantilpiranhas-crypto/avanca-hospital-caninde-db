# GHAES Session Mode

At the beginning of each AI-assisted development session, load this file once and apply it for the entire session.

This repository follows GHAES — Global Health AI Engineering Standard.

Reference:
https://github.com/erickgomesal/ghaes

## Session Rule

Use the repository instructions from:

- AGENTS.md
- CLAUDE.md
- CODEX.md
- DATABASE-STANDARD.md

Do not re-read all instruction files before every prompt unless the task requires it.

For normal tasks, apply the already loaded GHAES rules from the session context.

## Re-read Instructions Only When

Re-read the repository standards when the task touches:

- database structure;
- migrations;
- RLS or security policies;
- authentication;
- user roles or permissions;
- patient data;
- healthcare workflow persistence;
- audit logs;
- clinical or operational rules;
- production configuration;
- unclear or conflicting instructions.

## Mandatory Rules

- Make surgical, minimal and traceable changes.
- Do not commit without explicit authorization.
- Do not push without explicit authorization.
- Do not edit old migrations without explicit authorization.
- Do not weaken RLS policies.
- Do not remove auditability.
- Do not invent clinical or operational rules.
- Do not expose sensitive health data.
- Preserve patient safety and healthcare workflow integrity.

## Required Final Report

Every task must end with:

1. Summary
2. Files changed
3. Database objects changed
4. Migration impact
5. RLS/security impact
6. Healthcare workflow impact
7. Validation performed
8. Risks
9. Pending decisions
10. Commit/push status

## Short User Command

After this file is loaded once, the user may use short commands such as:

"Follow GHAES session mode and perform the task."

or

"Siga o modo GHAES da sessão. Não faça commit nem push."

Technology evolves. Principles endure.
