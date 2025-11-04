import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/schema",
  migrations: {
    path: "src/prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
