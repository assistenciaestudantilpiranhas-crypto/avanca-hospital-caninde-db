# AGENTS.md — Avança Hospital Canindé DB

This repository follows GHAES — Global Health AI Engineering Standard.

Reference:
https://github.com/erickgomesal/ghaes

## Project Context

This repository contains the database layer for the Avança Hospital Canindé / GSI ONE ecosystem.

It is responsible for:

- Supabase database schema;
- migrations;
- Row Level Security policies;
- authentication-related database structures;
- user profiles and permissions;
- audit logs;
- patient and attendance records;
- clinical workflow persistence;
- prescriptions, exams, pharmacy, transfers and indicators.

## Architecture

Official ecosystem architecture:

- GSI HealthTech = institutional ecosystem and umbrella brand.
- GSI ONE = digital health platform.
- Avança Hospital = implementation program and hospital use case.
- This repository = database and persistence layer.

## Mandatory Rules

All AI agents must follow these rules:

1. Follow GHAES principles.
2. Make surgical changes.
3. Never rewrite migrations unnecessarily.
4. Never change clinical workflow persistence without explicit approval.
5. Never weaken Row Level Security.
6. Never remove auditability.
7. Never expose sensitive health data.
8. Never create fake production data.
9. Never commit without explicit authorization.
10. Never push without explicit authorization.

## Delivery Format

Every AI task must end with:

- files changed;
- database objects changed;
- migrations created or modified;
- RLS impact;
- healthcare workflow impact;
- validation performed;
- risks and pending points.
