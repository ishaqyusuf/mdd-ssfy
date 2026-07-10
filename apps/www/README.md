This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Development Database

Normal local development uses Docker MySQL and Docker Redis:

```bash
bun run dev
```

The root dev command runs through `scripts/dev.ts`, which maps profile flags into `scripts/with-dev-infra.ts`. That sets the active `DATABASE_URL`, Redis/Upstash env, Docker service flags, and `GND_CACHE_NAMESPACE`.

Supported profiles:

```bash
bun run dev                         # local Docker MySQL + local Docker Redis
bun run dev --local                 # local Docker MySQL + local Docker Redis
bun run dev --remote-dev            # remote-dev DB + remote-dev Redis
bun run dev --prod                  # production-env www smoke on port 3005
```

Dev commands can also be narrowed to selected Turbo targets:

```bash
bun run dev --filter @gnd/site @gnd/www @gnd/jobs
bun run dev --filter @gnd/api! @gnd/site!
bun run dev --filter api site! @gnd/jobs
bun run dev -f api site!
```

Filter flags can be written as `--filter`, `--f`, `-f`, or `-filter`. Filter values use Turbo selector syntax directly. Exact package filters such as `@gnd/www` are validated against workspace package names and print the valid package list when missing. Bare exact package names such as `api` and `site!` are resolved to matching workspace packages before validation. Complex Turbo selectors such as `@gnd/www...`, `@gnd/*`, `{apps/*}`, and `[main]` pass through to Turbo.

The underlying env names are:

```bash
GND_DB_MODE=remote-dev|local
GND_REDIS_MODE=remote-dev|local
REMOTE_DEV_DATABASE_URL=
LOCAL_DATABASE_URL=mysql://root@127.0.0.1:3307/gnd-prisma2
REMOTE_DEV_REDIS_URL=
REMOTE_DEV_UPSTASH_REDIS_REST_URL=
REMOTE_DEV_UPSTASH_REDIS_REST_TOKEN=
LOCAL_REDIS_URL=redis://localhost:6379
```

Local Docker services remain available as explicit commands:

```bash
bun run dev:services:local
bun run dev:services:local-db
bun run dev:services:local-redis
bun run db:docker:up
bun run db:docker:down
```

`scripts/start-dev-services.sh` starts Docker MySQL only for a local DB profile and Docker Redis only for a local Redis profile. Remote profiles skip local Docker services.
If the local MySQL container is stuck on a stale runtime socket lock, the service script recreates the MySQL container once while preserving the named database volume.

Useful commands:

```bash
bun run db:generate
bun run db:migrate
```

Production-to-dev sync commands are explicit by target:

```bash
bun run db:sync:remote-dev:dry-run
GND_ALLOW_REMOTE_DEV_DB_SYNC=1 bun run db:sync:remote-dev
bun run db:sync:local:dry-run
bun run db:sync:local
```

Remote-dev sync writes require `GND_ALLOW_REMOTE_DEV_DB_SYNC=1`, refuse source-equals-target, and use a separate cursor state file from local sync.

Development cache keys use a non-production namespace:

```bash
GND_CACHE_NAMESPACE=dev
GND_ALLOW_PROD_REDIS_IN_DEV=0
```

Production should use `GND_CACHE_NAMESPACE=prod`; local Docker Redis profiles use `GND_CACHE_NAMESPACE=local`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
