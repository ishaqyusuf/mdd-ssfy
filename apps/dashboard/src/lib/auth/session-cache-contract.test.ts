import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sessionSource = readFileSync(
	join(process.cwd(), "apps/dashboard/src/lib/auth/session.ts"),
	"utf8",
);
const rootLayoutSource = readFileSync(
	join(process.cwd(), "apps/dashboard/src/app/layout.tsx"),
	"utf8",
);

describe("server auth request-cache integration", () => {
	test("uses React cache for zero-argument session reads", () => {
		assert.match(sessionSource, /import \{ cache \} from "react"/);
		assert.match(sessionSource, /createServerAuthSessionResolver\(\{/);
		assert.match(sessionSource, /\n\s+cache,/);
	});

	test("the root layout shares the zero-argument cached path", () => {
		assert.match(
			rootLayoutSource,
			/const initialSession = await getServerAuthSession\(\);/,
		);
		assert.doesNotMatch(
			rootLayoutSource,
			/getServerAuthSession\(headersList\)/,
		);
	});
});
