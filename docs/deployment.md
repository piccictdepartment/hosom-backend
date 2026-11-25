# HOSOM HELMS backend — local verification and deployment notes

The Phase 1 API is an Express 5 / TypeScript service using Prisma 7 and MySQL. The default local API address is `http://localhost:4000`.

## Local development

1. Install Node.js `>=22.12.0` and MySQL 8+.
2. Copy `.env.example` to `.env`; set `DATABASE_URL`, `TEST_DATABASE_URL` (separate `_test` database), a unique `JWT_SECRET` (at least 32 characters), and the frontend origin in `CORS_ORIGINS`.
3. Install packages with `npm ci`.
4. Back up any existing local database before schema changes. For a disposable development database, run `npm run db:sync` to push the current Prisma schema and regenerate the client.
5. Run `npm run db:seed` only against a disposable local database. The demo seeder clears sample data before recreating its test accounts.
6. Run `npm run typecheck`; run `npm test` only after verifying `TEST_DATABASE_URL` points to a separate database whose name ends in `_test`.
7. Start the API with `npm run dev`. Verify `GET /health` and `GET /ready`.
8. Start the frontend with `NEXT_PUBLIC_API_URL=http://localhost:4000` in its `.env.local`.

## Database migration warning

The supplied migration history currently contains only the initial users-table migration, while `prisma/schema.prisma` defines the wider Phase 1 model set. Therefore, `npm run db:deploy` alone does **not** currently guarantee that all Phase 1 tables exist. `db:sync` is for disposable local development only. Before production, generate and review the full migration from the current schema on the Windows development machine, apply it to a fresh dedicated test database, verify data-preserving upgrades, and only then use `prisma migrate deploy` for releases.

## Production checklist

- Use separate least-privilege MySQL accounts and databases for development, testing, staging and production.
- Store production secrets in the hosting platform's secret manager; never upload `.env` or `.env.local`.
- Set `NODE_ENV=production`, a unique `JWT_SECRET`, a suitable `SESSION_IDLE_TIMEOUT_MS`, and exact `CORS_ORIGINS` values.
- Serve the API behind HTTPS and a correctly configured reverse proxy. Set `TRUST_PROXY_HOPS` only to the known proxy count.
- Apply the reviewed migration once per release before starting the new API version.
- Run `npm ci`, `npm run typecheck`, `npm run build`, then `npm start` under a process supervisor.
- Check `/health` and `/ready` after deployment; monitor logs, errors and database connections.
- Schedule encrypted database and uploaded-file backups and test restoration. `src/jobs/backup.job.ts` is a placeholder, not an operational backup system.
- Do not use demo seeded accounts/passwords in production; change or remove them immediately after local verification.

## Current Phase 1 limitations

See `api-requirements-mapping.md` for the SRS traceability matrix and known gaps, including binary media storage, production password-reset email delivery, fine-grained permissions, audit logging, dashboard aggregation and modules outside this phase.
