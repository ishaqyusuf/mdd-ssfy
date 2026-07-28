import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const portlessApps = [
	["apps/dashboard/package.json", "gndprodesk"],
	["apps/dealership/package.json", "gnd-dealership"],
	["apps/storefront/package.json", "gnd-storefront"],
	["apps/gnd-backlog/package.json", "gnd-backlog"],
] as const;

describe("Portless development configuration", () => {
	it.each(portlessApps)(
		"%s reuses the shared proxy while retaining its app route and port",
		(manifestPath, routeName) => {
			const manifest = JSON.parse(
				readFileSync(resolve(root, manifestPath), "utf8"),
			) as { scripts?: { dev?: string } };
			const devScript = manifest.scripts?.dev ?? "";

			expect(devScript).toContain(`portless ${routeName}`);
			expect(devScript).toContain("PORTLESS_APP_PORT=");
			expect(devScript).not.toContain("PORTLESS_PORT=");
			expect(devScript).not.toContain("PORTLESS_HTTPS=");
		},
	);

	it("does not advertise a project-owned Portless proxy port", () => {
		const envExample = readFileSync(resolve(root, ".env.example"), "utf8");

		expect(envExample).not.toMatch(/^GND_PROXY_PORT=/m);
	});
});
