import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const workspaceRoot = join(import.meta.dir, "..");
const schemaDirectory = join(workspaceRoot, "packages", "db", "src", "schema");
const salesSchema = readFileSync(join(schemaDirectory, "sales.prisma"), "utf8");

function modelBody(schema, modelName) {
	const match = schema.match(
		new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`),
	);
	expect(match, `${modelName} must exist in sales.prisma`).not.toBeNull();
	return match?.[1] ?? "";
}

describe("DykeStepForm value storage", () => {
	test("stores free-form workflow values as text", () => {
		expect(modelBody(salesSchema, "DykeStepForm")).toMatch(
			/^\s*value\s+String\?\s+@db\.Text\s*$/m,
		);
	});

	test("has a deployable migration that widens the existing column", () => {
		const migrationsDirectory = join(
			workspaceRoot,
			"packages",
			"db",
			"src",
			"migrations",
		);
		const migrationSql = readdirSync(migrationsDirectory, {
			withFileTypes: true,
		})
			.filter((entry) => entry.isDirectory())
			.map((entry) => join(migrationsDirectory, entry.name, "migration.sql"))
			.filter(existsSync)
			.map((migrationPath) => readFileSync(migrationPath, "utf8"))
			.join("\n");

		expect(migrationSql).toMatch(
			/ALTER TABLE `DykeStepForm`[\s\S]*?MODIFY `value` TEXT NULL/,
		);
	});
});
