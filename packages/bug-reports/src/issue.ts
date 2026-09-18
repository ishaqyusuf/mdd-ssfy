import { createHash } from "node:crypto";

export type BugReportGithubConfig = {
	token: string;
	repository: string;
	appBaseUrl: string;
	labels: string[];
	actorId: number;
};

type BugReportGithubEnv = Record<string, string | undefined> & {
	BUG_REPORT_GITHUB_TOKEN?: string;
	GITHUB_TOKEN?: string;
	BUG_REPORT_GITHUB_REPOSITORY?: string;
	BUG_REPORT_GITHUB_REPO?: string;
	BUG_REPORT_GITHUB_LABELS?: string;
	BUG_REPORT_GITHUB_ACTOR_ID?: string;
	BUG_REPORT_APP_BASE_URL?: string;
};

export type BugReportDeliveryInput = {
	id: string;
	description?: string | null;
	captureType: "VIDEO" | "SCREENSHOT" | string;
	currentUrl?: string | null;
	durationMs?: number | null;
	createdAt: Date;
	appBaseUrl: string;
};

const repositoryPattern = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/;

function normalizeHttpsOrigin(value: string) {
	try {
		const url = new URL(value);
		if (url.protocol !== "https:" || url.username || url.password) return null;
		return url.origin;
	} catch {
		return null;
	}
}

export function parseBugReportLabels(value?: string) {
	return Array.from(
		new Set(
			(value || "bug,reported-from-gnd")
				.split(",")
				.map((label) => label.trim())
				.filter((label) => /^[A-Za-z0-9_. -]{1,50}$/.test(label)),
		),
	).slice(0, 10);
}

export function getBugReportGithubConfig(
	env: BugReportGithubEnv = process.env,
): BugReportGithubConfig | null {
	const token = (env.BUG_REPORT_GITHUB_TOKEN || env.GITHUB_TOKEN || "").trim();
	const repository = (
		env.BUG_REPORT_GITHUB_REPOSITORY ||
		env.BUG_REPORT_GITHUB_REPO ||
		""
	).trim();
	const appBaseUrl = normalizeHttpsOrigin(
		env.BUG_REPORT_APP_BASE_URL?.trim() || "",
	);
	const actorId = /^\d+$/.test(env.BUG_REPORT_GITHUB_ACTOR_ID || "")
		? Number(env.BUG_REPORT_GITHUB_ACTOR_ID)
		: null;
	if (
		!token ||
		!appBaseUrl ||
		!Number.isSafeInteger(actorId) ||
		(actorId ?? 0) <= 0 ||
		!repositoryPattern.test(repository) ||
		repository.length > 200
	)
		return null;
	return {
		token,
		repository,
		appBaseUrl,
		labels: parseBugReportLabels(env.BUG_REPORT_GITHUB_LABELS),
		actorId: actorId as number,
	};
}

export function sanitizeBugReportPageUrl(value?: string | null) {
	if (!value) return null;
	try {
		const url = new URL(value);
		if (!["http:", "https:"].includes(url.protocol)) return null;
		url.username = "";
		url.password = "";
		url.search = "";
		url.hash = "";
		return url.toString().replace(/\/$/, url.pathname === "/" ? "/" : "");
	} catch {
		return null;
	}
}

function sanitizeGithubText(value: string) {
	const withoutControls = Array.from(value)
		.filter((character) => {
			const codePoint = character.codePointAt(0);
			if (codePoint === undefined) return true;
			return !(
				(codePoint < 32 && ![9, 10, 13].includes(codePoint)) ||
				codePoint === 127
			);
		})
		.join("");

	return withoutControls
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/@(?!\s)/g, "@ ")
		.trim();
}

function formatDuration(durationMs?: number | null) {
	if (!durationMs || durationMs < 1) return null;
	return `${Math.ceil(durationMs / 1000)} seconds`;
}

export function buildBugReportDelivery(input: BugReportDeliveryInput) {
	if (
		!/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(input.id) ||
		!Number.isFinite(input.createdAt.getTime())
	)
		throw new Error("Invalid bug report delivery input");
	const appBaseUrl = normalizeHttpsOrigin(input.appBaseUrl);
	if (!appBaseUrl) throw new Error("Invalid bug report application origin");
	const description = sanitizeGithubText(
		input.description || "Bug report",
	).slice(0, 5_000);
	const pageUrl = sanitizeBugReportPageUrl(input.currentUrl);
	const reportUrl = `${appBaseUrl}/support/bug-reports?reportId=${encodeURIComponent(input.id)}`;
	const duration = formatDuration(input.durationMs);
	const evidence = [
		`Bug report ID: ${input.id}`,
		`Capture: ${sanitizeGithubText(input.captureType).slice(0, 30)}`,
		duration ? `Duration: ${duration}` : null,
		`Captured: ${input.createdAt.toISOString()}`,
		pageUrl ? `Page: ${pageUrl}` : null,
		`Evidence and follow-up: ${reportUrl}`,
		"",
		"User description:",
		description || "No description supplied.",
	]
		.filter((line): line is string => line !== null)
		.join("\n");
	const titleSource = description || "Bug report";
	return {
		actionKey: createHash("sha256")
			.update(`bug-report:${input.id}:github:v1`)
			.digest("hex"),
		title: `[GND Bug] ${titleSource}`.slice(0, 160),
		evidence,
		reportUrl,
	};
}
