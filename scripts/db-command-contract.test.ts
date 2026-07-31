import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

function scripts(path: string): Record<string, string> {
  return (JSON.parse(readFileSync(resolve(root, path), "utf8")) as {
    scripts?: Record<string, string>;
  }).scripts ?? {};
}

describe("shared database command contract", () => {
  test("exposes one mode-aware root command per database action", () => {
    const rootScripts = scripts("package.json");
    const prefix = "bun --env-file=/dev/null ../../local-infra-kit/bin/db.ts";

    expect(rootScripts["db:generate"]).toBe(`${prefix} generate --profile gnd`);
    expect(rootScripts["db:migrate"]).toBe(`${prefix} migrate --profile gnd`);
    expect(rootScripts["db:pull"]).toBe(`${prefix} pull --profile gnd`);
    expect(rootScripts["db:push"]).toBe(`${prefix} push --profile gnd`);
    expect(rootScripts["db:studio"]).toBe(`${prefix} studio --profile gnd`);
    expect(
      Object.keys(rootScripts).filter((name) =>
        /^db:(generate|migrate|pull|push|studio):/.test(name),
      ),
    ).toEqual([]);
  });

  test("keeps only raw package commands", () => {
    const packageScripts = scripts("packages/db/package.json");

    expect(packageScripts["db:generate"]).toBe("prisma generate");
    expect(packageScripts["db:migrate"]).toBe("prisma migrate dev");
    expect(packageScripts["db:migrate:deploy"]).toBe("prisma migrate deploy");
    expect(packageScripts["db:pull"]).toBe("prisma db pull");
    expect(packageScripts["db:push"]).toBe("prisma db push");
    expect(packageScripts["db:studio"]).toBe("prisma studio --port 5556");
  });

  test("exposes one production-to-destination synchronization command", () => {
    const rootScripts = scripts("package.json");
    const packageScripts = scripts("packages/db/package.json");

    expect(rootScripts["db:sync"]).toBe(
      "bun --env-file=/dev/null ../../local-infra-kit/bin/db-sync.ts --profile gnd",
    );
    expect(packageScripts["db:sync"]).toBe(
      "bun scripts/sync-prod-to-local.ts",
    );
    expect(
      Object.keys(rootScripts).filter(
        (name) => name.startsWith("db:sync:") || name.startsWith("db:update:"),
      ),
    ).toEqual([]);
    expect(
      Object.keys(packageScripts).filter((name) => name.startsWith("db:sync:")),
    ).toEqual([]);
  });

  test("has no repository-local database profile router", () => {
    expect(existsSync(resolve(root, "scripts/db-command.ts"))).toBe(false);
    expect(existsSync(resolve(root, "scripts/db-push.ts"))).toBe(false);
  });
});
