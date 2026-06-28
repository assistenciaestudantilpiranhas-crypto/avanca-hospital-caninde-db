# Mandatory GHAES Session Startup

At the start of each AI-assisted development session, read `GHAES-SESSION.md` once and apply it for the entire session.

Do not re-read all standard files before every prompt unless the task is sensitive, unclear or explicitly requires it.

This repository follows GHAES — Global Health AI Engineering Standard:
https://github.com/erickgomesal/ghaes

---
# CODEX.md — Database Repository Instructions

This repository follows GHAES — Global Health AI Engineering Standard.

Reference:
https://github.com/erickgomesal/ghaes

Codex must operate with surgical changes and strict database safety.

## Repository Scope

This repository is responsible for the database layer of the GSI ONE / Avança Hospital ecosystem.

It may contain:

- Supabase migrations;
- database schemas;
- Row Level Security policies;
- database functions;
- triggers;
- audit logs;
- user roles and permissions;
- clinical workflow persistence.

## Allowed Work

Codex may assist with:

- reviewing SQL migrations;
- creating new migrations when explicitly requested;
- documenting schema changes;
- checking RLS consistency;
- improving database documentation;
- identifying risks in schema design.

## Not Allowed Without Authorization

Codex must not:

- edit previous migrations;
- delete migration files;
- change RLS policies broadly;
- delete tables;
- drop columns;
- rename production fields;
- modify authentication-related structures;
- alter audit logs;
- create fake production data;
- commit or push.

## Required Delivery

Every task must report:

- changed files;
- affected tables;
- affected policies;
- affected functions or triggers;
- validation performed;
- risks;
- whether commit or push was performed.

