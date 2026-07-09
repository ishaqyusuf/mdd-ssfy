// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { envFilesForCwd, loadEnvFiles, resolveDevInfraEnv } from "./with-dev-infra";

const BASE_ENV = {
	REMOTE_DEV_DATABASE_URL: "mysql://remote-user:secret@aws.connect.psdb.cloud/gnd-dev",
	LOCAL_DATABASE_URL: "mysql://root@127.0.0.1:3307/gnd-prisma2",
	REMOTE_DEV_UPSTASH_REDIS_REST_URL: "https://remote-dev-redis.example.com",
	REMOTE_DEV_UPSTASH_REDIS_REST_TOKEN: "remote-token",
	LOCAL_REDIS_URL: "redis://localhost:6379",
};

describe("with-dev-infra env resolver", () => {
	test("local DB and local Redis starts both Docker services", () => {
		const env = resolveDevInfraEnv(BASE_ENV, { dbMode: "local", redisMode: "local" });

		expect(env.DATABASE_URL).toBe(BASE_ENV.LOCAL_DATABASE_URL);
		expect(env.REDIS_URL).toBe(BASE_ENV.LOCAL_REDIS_URL);
		expect(env.GND_START_MYSQL).toBe("1");
		expect(env.GND_START_REDIS).toBe("1");
		expect(env.GND_CACHE_NAMESPACE).toBe("local");
		expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
	});

	test("local DB and remote Redis starts only Docker MySQL", () => {
		const env = resolveDevInfraEnv(BASE_ENV, { dbMode: "local", redisMode: "remote-dev" });

		expect(env.DATABASE_URL).toBe(BASE_ENV.LOCAL_DATABASE_URL);
		expect(env.UPSTASH_REDIS_REST_URL).toBe(BASE_ENV.REMOTE_DEV_UPSTASH_REDIS_REST_URL);
		expect(env.GND_START_MYSQL).toBe("1");
		expect(env.GND_START_REDIS).toBe("auto");
		expect(env.GND_CACHE_NAMESPACE).toBe("dev");
	});

	test("remote DB and local Redis starts only Docker Redis", () => {
		const env = resolveDevInfraEnv(BASE_ENV, { dbMode: "remote-dev", redisMode: "local" });

		expect(env.DATABASE_URL).toBe(BASE_ENV.REMOTE_DEV_DATABASE_URL);
		expect(env.REDIS_URL).toBe(BASE_ENV.LOCAL_REDIS_URL);
		expect(env.GND_START_MYSQL).toBe("auto");
		expect(env.GND_START_REDIS).toBe("1");
		expect(env.GND_CACHE_NAMESPACE).toBe("local");
	});

	test("remote DB and remote Redis starts no Docker services", () => {
		const env = resolveDevInfraEnv(BASE_ENV, { dbMode: "remote-dev", redisMode: "remote-dev" });

		expect(env.DATABASE_URL).toBe(BASE_ENV.REMOTE_DEV_DATABASE_URL);
		expect(env.UPSTASH_REDIS_REST_URL).toBe(BASE_ENV.REMOTE_DEV_UPSTASH_REDIS_REST_URL);
		expect(env.GND_START_MYSQL).toBe("auto");
		expect(env.GND_START_REDIS).toBe("auto");
		expect(env.GND_CACHE_NAMESPACE).toBe("dev");
	});

	test("remote Redis ignores a local REDIS_URL fallback", () => {
		const env = resolveDevInfraEnv(
			{
				...BASE_ENV,
				REDIS_URL: "redis://localhost:6379",
			},
			{ dbMode: "remote-dev", redisMode: "remote-dev" },
		);

		expect(env.REDIS_URL).toBeUndefined();
		expect(env.UPSTASH_REDIS_REST_URL).toBe(BASE_ENV.REMOTE_DEV_UPSTASH_REDIS_REST_URL);
		expect(env.GND_CACHE_NAMESPACE).toBe("dev");
	});

	test("remote DB ignores a local DATABASE_URL when a remote-dev URL exists", () => {
		const env = resolveDevInfraEnv(
			{
				...BASE_ENV,
				GND_DB_MODE: "remote-dev",
				DATABASE_URL: BASE_ENV.LOCAL_DATABASE_URL,
			},
			{ redisMode: "remote-dev" },
		);

		expect(env.DATABASE_URL).toBe(BASE_ENV.REMOTE_DEV_DATABASE_URL);
		expect(env.GND_START_MYSQL).toBe("auto");
	});

	test("package cwd env loading layers root env before package env", () => {
		const root = mkdtempSync(join(tmpdir(), "gnd-env-"));
		const packageDir = join(root, "packages", "jobs");
		mkdirSync(packageDir, { recursive: true });
		writeFileSync(
			join(root, "package.json"),
			JSON.stringify({ private: true, workspaces: ["packages/*"] }),
		);
		writeFileSync(
			join(root, ".env.local"),
			[
				"GND_DB_MODE=remote-dev",
				`REMOTE_DEV_DATABASE_URL=${BASE_ENV.REMOTE_DEV_DATABASE_URL}`,
				`LOCAL_DATABASE_URL=${BASE_ENV.LOCAL_DATABASE_URL}`,
				`REMOTE_DEV_UPSTASH_REDIS_REST_URL=${BASE_ENV.REMOTE_DEV_UPSTASH_REDIS_REST_URL}`,
				`REMOTE_DEV_UPSTASH_REDIS_REST_TOKEN=${BASE_ENV.REMOTE_DEV_UPSTASH_REDIS_REST_TOKEN}`,
			].join("\n"),
		);
		writeFileSync(
			join(packageDir, ".env.local"),
			"TRIGGER_PROFILE=redland\n",
		);

		const env = loadEnvFiles(envFilesForCwd(packageDir));

		expect(env.REMOTE_DEV_DATABASE_URL).toBe(BASE_ENV.REMOTE_DEV_DATABASE_URL);
		expect(env.TRIGGER_PROFILE).toBe("redland");
	});
});
