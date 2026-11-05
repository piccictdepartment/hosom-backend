# Database and deployment development notes

This backend uses Express, Prisma 7, and MySQL. `src/modules/users` is the only implemented feature; the other module directories are placeholders.

## Local database workflow

1. Set `DATABASE_URL` in `.env` to a local MySQL database. Keep `.env` out of Git.
2. Apply committed migrations with `npm run db:deploy` and generate the client with `npm run db:generate`.
3. After editing `prisma/schema.prisma`, create a migration with `npm run db:migrate -- --name describe_change`. Review and commit its SQL.
4. Run `npm run typecheck` and the relevant integration tests before deployment.

Use a separate `TEST_DATABASE_URL` whose database name ends in `_test`. The integration tests reject the application database and delete test users. Never point them at data you need to retain.

## Seeders

Keep three kinds of seed data separate:

| Kind | Examples | Environment |
| --- | --- | --- |
| Reference | Roles, statuses, program types | Development, staging, production |
| Demo | Sample users and courses | Development only |
| Test fixtures | Minimal records for one test | Dedicated test database only |

Make seeders safe to rerun. Use a stable unique field with `upsert`, and seed parent records before dependent records. Do not put real personal data, shared passwords, or secrets in seed files. Production reference seeds should be an explicit deployment step; demo seeds should refuse to run in production.

To enable Prisma 7's seed command, add `seed: "tsx prisma/seed.ts"` inside the `migrations` object in `prisma.config.ts`, and add `"db:seed": "prisma db seed"` to `package.json` scripts. Prisma 7 runs this only when `npm run db:seed` is invoked. An example for the current `User` model:

```ts
import { prisma } from "../src/config/database.js";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seeds must not run in production");
  }

  await prisma.user.upsert({
    where: { email: "demo@example.test" },
    update: { name: "Demo User" },
    create: { name: "Demo User", email: "demo@example.test" },
  });
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
```

As models are added, split seed logic into `prisma/seeds/reference.ts` and `prisma/seeds/demo.ts`, with `prisma/seed.ts` selecting which to run. Verify the target `DATABASE_URL` before any seed command.

## Adding a feature

Follow the users module: Prisma model and migration, request validation, repository, service, controller, routes, then integration tests. Register the router in `src/routes/index.ts`. Add authorization before exposing student, payment, or academic records. For changes to populated tables, add new fields first, deploy compatible code, backfill data, and remove old fields in a later release.

## Deployment

Use separate database credentials for development, tests, staging, and production. Store production credentials in the deployment platform's secrets facility. A release should run `npm ci`, `npm run typecheck`, `npm run build`, and `npm run db:deploy`, then start with `npm start`. Run migrations once per release, before starting new API instances. Check `/health` and `/ready` after deployment.

Set `NODE_ENV=production`, configure `CORS_ORIGINS`, serve the API through HTTPS and a reverse proxy, and use a process supervisor that restarts it after failures. Schedule database backups and periodically verify a restore. `src/jobs/backup.job.ts` is currently a placeholder, not a backup system.

## Scaling

Measure query latency, request latency, errors, and database connections before increasing capacity. Add indexes based on real filters and joins, use pagination for growing collections, and keep API instances stateless. Multiple instances need a load balancer and a shared store for any cross-instance state. Move emails, reminders, and other long-running work to a queue with dedicated workers. Account for each instance's database connection pool when setting MySQL connection limits.

References: [Prisma 7 seeding](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding), [Prisma migration deployment](https://docs.prisma.io/docs/cli/v7/migrate/deploy), [Prisma connection pools](https://docs.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool), [Express production guidance](https://expressjs.com/en/advanced/best-practice-performance/).
