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

Open [http://localhost:3010](http://localhost:3010) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Development Database

Normal local development uses Docker MySQL. Redis is opt-in:

```bash
bun run dev
```

The root dev command runs through the shared `../../local-infra-kit` profile for GND. It selects the active `DATABASE_URL`, Redis/Upstash env, and Docker service flags from the requested profile.

Supported profiles:

```bash
bun run dev                         # local Docker MySQL only
bun run dev --local                 # local Docker MySQL only
bun run dev --local --redis-local   # local Docker MySQL + local Docker Redis
bun run dev --local --redis-remote  # local Docker MySQL + remote-dev Redis
bun run dev --remote-dev            # remote-dev DB only
bun run dev --remote-dev --redis-local # remote-dev DB + local Docker Redis
bun run dev --remote-dev --redis-remote # remote-dev DB + remote-dev Redis
bun run dev --prod                  # production-env www smoke on port 3015
```

Redis is only enabled when `--redis-local`, `--redis-remote`, or `--redis-remote-dev` is passed. Redis flags are only supported for local and remote-dev profiles.

Dev commands can also be narrowed to selected Turbo targets:

```bash
bun run dev --filter @gnd/storefront @gnd/www @gnd/jobs
bun run dev --filter @gnd/api! @gnd/storefront!
bun run dev --filter api site! @gnd/jobs
bun run dev -f api site!
```

Filter flags can be written as `--filter`, `--f`, `-f`, or `-filter`. Filter values use Turbo selector syntax directly. Exact package filters such as `@gnd/www` are validated against workspace package names and print the valid package list when missing. Bare exact package names such as `api` and `site!` are resolved to matching workspace packages before validation. Complex Turbo selectors such as `@gnd/www...`, `@gnd/*`, `{apps/*}`, and `[main]` pass through to Turbo.

The underlying env contract is:

```bash
.env.local         DATABASE_URL=mysql://root@127.0.0.1:3307/gnd-prisma2
.env.local         REDIS_URL=<optional-local-redis-url>
.env.remote.local  DATABASE_URL=<hosted-dev-mysql-url>
.env.remote.local  REDIS_URL=<hosted-dev-redis-url>
.env.remote.local  UPSTASH_REDIS_REST_URL=<optional-hosted-dev-rest-url>
.env.remote.local  UPSTASH_REDIS_REST_TOKEN=<optional-hosted-dev-rest-token>
.env.production    DATABASE_URL=<production-mysql-url>
```

Local Docker services remain available as explicit commands:

```bash
bun run dev:services:local
bun run dev:services:local-db
bun run dev:services:local-redis
bun run db:docker:up
bun run db:docker:down
```

`../../local-infra-kit/bin/dev-services.ts --profile gnd` starts Docker MySQL only for a local DB profile and Docker Redis only for an explicitly requested local Redis profile. Remote profiles skip local Docker services.
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

Development cache keys use a non-production namespace automatically:

```bash
GND_ALLOW_PROD_REDIS_IN_DEV=0
```

Production uses the `prod` namespace when `NODE_ENV=production`; local and development runtimes default to `local`. Override `GND_CACHE_NAMESPACE` only for one-off debugging.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
