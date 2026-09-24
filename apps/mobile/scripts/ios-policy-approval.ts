import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type IosPolicyApproval = {
	status: "pending" | "approved";
	approvedUrl: string | null;
	approvedContentSha256: string | null;
	approvedOn: string | null;
	approvedBy: string | null;
};

type IosPolicySources = {
	privacyPage: string;
	termsPage: string;
	legalLayout: string;
};
const DRAFT_MARKER =
	/\bdraft\b|review copy|pending (?:GND |legal )?review|not yet (?:an? )?approved|index:\s*false|noindex/i;

export async function readCurrentIosPolicySources(
	repositoryRoot = path.resolve(import.meta.dir, "../../.."),
): Promise<IosPolicySources> {
	const dashboardRoot = path.join(repositoryRoot, "apps/dashboard/src");
	const [privacyPage, termsPage, legalLayout] = await Promise.all([
		readFile(
			path.join(dashboardRoot, "app/(public)/privacy-policy/page.tsx"),
			"utf8",
		),
		readFile(
			path.join(dashboardRoot, "app/(public)/terms-of-use/page.tsx"),
			"utf8",
		),
		readFile(
			path.join(dashboardRoot, "components/legal/legal-draft-layout.tsx"),
			"utf8",
		),
	]);
	return { privacyPage, termsPage, legalLayout };
}

export function hashIosPolicySources(sources: IosPolicySources): string {
	const hash = createHash("sha256");
	for (const key of ["privacyPage", "termsPage", "legalLayout"] as const) {
		hash.update(key);
		hash.update("\0");
		hash.update(sources[key]);
		hash.update("\0");
	}
	return hash.digest("hex");
}

export function evaluateIosPolicyApproval(
	configuredUrl: unknown,
	approval: IosPolicyApproval,
	sources: IosPolicySources,
): { ok: boolean; detail: string } {
	if (
		typeof configuredUrl !== "string" ||
		!configuredUrl.startsWith("https://")
	) {
		return {
			ok: false,
			detail:
				"Missing HTTPS EXPO_PUBLIC_PRIVACY_POLICY_URL; owner/legal approval required before a public build",
		};
	}
	if (
		approval.status !== "approved" ||
		approval.approvedUrl !== configuredUrl ||
		!approval.approvedOn ||
		approval.approvedBy !== "GND MILLWORK CORP"
	) {
		return {
			ok: false,
			detail:
				"The configured privacy URL has no matching GND-approved policy record",
		};
	}
	if (DRAFT_MARKER.test(Object.values(sources).join("\n"))) {
		return {
			ok: false,
			detail:
				"The policy pages still contain an AI-assisted review-draft marker",
		};
	}
	if (approval.approvedContentSha256 !== hashIosPolicySources(sources)) {
		return {
			ok: false,
			detail:
				"The policy page source changed after GND approval; review it again",
		};
	}
	return { ok: true, detail: `GND-approved policy URL: ${configuredUrl}` };
}

if (import.meta.main) {
	const sources = await readCurrentIosPolicySources();
	if (DRAFT_MARKER.test(Object.values(sources).join("\n"))) {
		console.error(
			"The ProDesk policy pages are still marked as review drafts.",
		);
		process.exit(1);
	}
	console.log(hashIosPolicySources(sources));
}
