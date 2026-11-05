# HOSOM backend

Development guidance for database changes, seeders, deployment, and scaling is in [docs/database-development.md](docs/database-development.md).

A TypeScript Express API with a basic user profile module and Prisma persistence in MySQL. The existing project layout is retained; only users and the shared API infrastructure are wired up. Other module files are placeholders for later work.

## Run locally

Run commands from this directory with Node.js 22.12 or newer:

```bash
npm install
cp .env.example .env
docker compose up -d --wait mysql
npm run db:deploy
npm run db:generate
npm run dev
```

The API listens at `http://localhost:3000`. Docker Compose provides a local MySQL server and creates the `hosom` database and account. If you already have MySQL, skip the Docker command, create a database and user, and set `DATABASE_URL` in `.env`:

```dotenv
DATABASE_URL=mysql://hosom:hosom_local_password@127.0.0.1:3306/hosom
```

Replace the example credentials with your own and percent-encode special characters in the username or password. The runtime and Prisma commands use this same connection URL. Prisma uses the MySQL provider with its `@prisma/adapter-mariadb` driver adapter, which supports MySQL servers. The Compose credentials are local development defaults; set `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `MYSQL_PORT` as needed and keep `DATABASE_URL` consistent with them.

```bash
npm run typecheck
npm test
npm run build
npm start
```

Integration tests use a dedicated MySQL database specified by `TEST_DATABASE_URL`. Before running `npm test`, provision `hosom_test` and grant the test account access. For the default Docker setup, open `docker compose exec mysql mysql -uroot -p` (the default local root password is `hosom_root_local_password`) and run:

```sql
CREATE DATABASE hosom_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON hosom_test.* TO 'hosom'@'%';
```

```dotenv
TEST_DATABASE_URL=mysql://hosom:hosom_local_password@127.0.0.1:3306/hosom_test
```

Tests apply the MySQL migration, exercise HTTP requests and Prisma queries, and delete test users between tests and on completion. They require a database name ending in `_test` and reject the configured application database. Never use a database containing application data for these tests.

After schema changes, run `npm run db:migrate -- --name describe_change`, then `npm run db:generate`. `db:migrate` needs a development account permitted to create a shadow database. Commit migrations; use `npm run db:deploy` to apply them in deployed environments. Builds generate the client and compile TypeScript; migrations are a separate step.

The initial migration is now MySQL SQL for a fresh database. Any earlier local SQLite database files are retained but are no longer used; this change does not copy their data to MySQL.

## Request flow and structure

```text
Request → Route → Validation → Controller → Service → Repository → Prisma → MySQL
                               ↓
                         JSON response
Errors → centralized error handler → JSON error response

src/
  app.ts                    Express configuration and middleware registration
  server.ts                 Startup, database connection and graceful shutdown
  config/                   Validated environment, CORS and shared Prisma client
  routes/index.ts           Mounts feature routers under /api
  middleware/               Validation, errors, request logging and rate limiting
  core/errors/AppError.ts   Expected application errors
  core/responses/           Shared success response helper
  modules/users/
    user.routes.ts          HTTP methods, paths and validation middleware
    user.validation.ts      Body, ID and pagination schemas
    user.controller.ts      HTTP input/output only
    user.service.ts         User operations and application rules
    user.repository.ts      Database queries only
    user.types.ts           Inputs shared by service and repository
  generated/prisma/         Generated client; do not edit or commit
prisma/
  schema.prisma             User model
  migrations/               Initial user table and unique email index
tests/integration/          HTTP and database integration tests
```

To add a module, follow the users layout, register its router in `src/routes/index.ts`, and add its model and migration when needed. Express request/response objects stay in controllers and middleware. All Prisma queries live in repositories, apart from shared startup/readiness checks.

## User endpoints

The API contract is also available in [docs/openapi.yaml](docs/openapi.yaml).

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/users` | Create a user; 201 with Location header |
| GET | `/api/users?page=1&limit=20` | List users with pagination; 200 |
| GET | `/api/users/:id` | Get a user; 200 |
| PATCH | `/api/users/:id` | Update name and/or email; 200 |
| DELETE | `/api/users/:id` | Delete a user; 204 with no body |
| GET | `/health` | Process liveness; 200 |
| GET | `/ready` | Database and user table readiness; 200 or 503 |

```bash
curl -i http://localhost:3000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com"}'

curl 'http://localhost:3000/api/users?page=1&limit=20'
curl http://localhost:3000/api/users/USER_ID
curl -X PATCH http://localhost:3000/api/users/USER_ID \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice Smith"}'
curl -i -X DELETE http://localhost:3000/api/users/USER_ID
```

Replace `USER_ID` with the returned UUID. A user has `id`, `name`, `email`, `createdAt`, and `updatedAt`. Names are trimmed; emails are trimmed and lowercased before persistence. Unknown body fields, invalid UUIDs, blank names, invalid emails, and empty patches return 400. List pagination defaults to page 1 and limit 20; limit is capped at 100 and page at 1,000,000. Missing users return 404 and duplicate emails return 409, including concurrent writes.

Success responses use `{ "success": true, "data": ... }`. Lists also include `meta.pagination` with `page`, `limit`, `total`, and `totalPages`. Errors use:

```json
{
  "success": false,
  "error": { "code": "USER_NOT_FOUND", "message": "User not found" },
  "requestId": "generated-request-id"
}
```

Validation errors also include `error.details` with field names and messages. Unexpected errors are logged server-side and return a generic 500 response.

## API configuration

- Environment validation fails startup with useful field errors.
- Helmet sets security headers; Express identification is disabled.
- CORS permits the exact origins in `CORS_ORIGINS` (comma separated). Requests without an Origin header, such as curl, are accepted. CORS is not authentication.
- JSON and URL-encoded bodies are limited to `BODY_LIMIT` (default 100 KB). Malformed JSON returns 400, unsupported encodings 415, and oversized bodies 413.
- `/api` requests are limited per client IP (default 100 per 15 minutes), with standard rate-limit headers and JSON 429 errors. The default store is in memory; use a shared store for multiple application instances.
- Each request receives `X-Request-Id`; logs record method, path, status, and duration without bodies or query strings.
- `TRUST_PROXY_HOPS` defaults to 0. Set it to match your deployment's actual trusted proxy chain so client-IP rate limiting stays correct.
- Startup checks the migrated user table. SIGINT/SIGTERM stop accepting requests, drain ongoing requests, and disconnect Prisma, with a 10-second shutdown deadline.

This module manages public user profiles. Authentication, passwords, and role-based access are not implemented; the existing auth and other domain files remain placeholders. Add authentication and authorization before exposing user administration to untrusted clients.

Implementation references: [Express security guidance](https://expressjs.com/en/advanced/best-practice-security/) and [Prisma MySQL setup](https://www.prisma.io/docs/v7/prisma-orm/quickstart/mysql).
