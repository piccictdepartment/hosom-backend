# API architecture

The implemented feature is `src/modules/users`. Other feature directories are reserved placeholders.

Persistence uses MySQL through Prisma's MySQL provider and MariaDB driver adapter. Both the Prisma CLI and application use `DATABASE_URL`. `compose.yaml` provides an optional local MySQL server. Integration tests require a separate MySQL database configured with `TEST_DATABASE_URL`.

Requests pass through shared logging, security headers, CORS, rate limiting and body parsing. `src/routes/index.ts` mounts feature routers under `/api`. User routes validate their inputs before invoking controllers.

Controllers read validated HTTP input and format responses. Services perform application operations and missing-user checks. Repositories own Prisma queries, including the transaction used to return a user list and its total count. The database's unique email constraint remains the final authority for conflicting creates and updates.

Validation data is stored in `res.locals.validated`; middleware does not overwrite Express request getters. Express forwards rejected async handlers to the centralized error handler, which maps expected application, validation, database and parser errors to consistent JSON responses.

`app.ts` exports the application without binding a port, so integration tests can exercise the same middleware and routes. `server.ts` owns database readiness, HTTP startup, timeouts and signal handling. Prisma migrations are applied separately before startup.
