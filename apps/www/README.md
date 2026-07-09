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

Local development uses the database URL configured in the root `.env.local`.
The active development database should point at the hosted dev branch instead of the old local Docker MySQL instance.

The main dev entry points still run `bun run dev:prepare`, but `scripts/start-dev-services.sh` now skips the local MySQL container whenever `DATABASE_URL` points to a non-local host. It also skips the local Redis container whenever `REDIS_URL` points to a non-local host or `UPSTASH_REDIS_REST_URL` is configured.

Useful commands:

```bash
bun run db:generate
bun run db:migrate
```

If you intentionally need the retired local Docker MySQL fallback for recovery work, force it with a local `DATABASE_URL` or `GND_START_MYSQL=1` before running the service script. Normal app development should use the hosted dev database branch.

Local development may point at the shared production Redis account, but cache keys must use a non-production namespace:

```bash
GND_CACHE_NAMESPACE=local
GND_ALLOW_PROD_REDIS_IN_DEV=0
```

Production should use `GND_CACHE_NAMESPACE=prod`. If you intentionally need local Docker Redis, force it with a local `REDIS_URL` or `GND_START_REDIS=1`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
