import { defineConfig, env } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "src/schema",
  migrations: {
    path: "src/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
