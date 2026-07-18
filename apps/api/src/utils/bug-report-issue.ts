type GitHubBugReportIssueConfig = {
	provider: "github";
	token: string;
	repository: string;
	apiBaseUrl: string;
	labels: string[];
};

type JiraBugReportIssueConfig = {
	provider: "jira";
	token: string;
	email?: string;
	apiBaseUrl: string;
	projectKey: string;
	issueType: string;
	labels: string[];
};

export type BugReportIssueConfig =
	| GitHubBugReportIssueConfig
	| JiraBugReportIssueConfig;

export type BugReportIssueInput = {
	id: string;
	title: string;
	description?: string | null;
	currentUrl?: string | null;
	captureType?: string | null;
	evidenceUrl?: string | null;
	transcriptionText?: string | null;
	createdBy?: {
		name?: string | null;
		email?: string | null;
	} | null;
};

export type BugReportIssueResult = {
	provider: "github" | "jira";
	key: string;
	url: string;
};

type IssueEnv = {
	[key: string]: string | undefined;
	BUG_REPORT_ISSUE_PROVIDER?: string;
	BUG_REPORT_GITHUB_TOKEN?: string;
	BUG_REPORT_GITHUB_REPOSITORY?: string;
	BUG_REPORT_GITHUB_REPO?: string;
	BUG_REPORT_GITHUB_API_BASE_URL?: string;
	BUG_REPORT_GITHUB_LABELS?: string;
	BUG_REPORT_JIRA_API_BASE_URL?: string;
	BUG_REPORT_JIRA_BASE_URL?: string;
	BUG_REPORT_JIRA_EMAIL?: string;
	BUG_REPORT_JIRA_API_TOKEN?: string;
	BUG_REPORT_JIRA_TOKEN?: string;
	BUG_REPORT_JIRA_PROJECT_KEY?: string;
	BUG_REPORT_JIRA_ISSUE_TYPE?: string;
	BUG_REPORT_JIRA_LABELS?: string;
	GITHUB_TOKEN?: string;
};

type FetchLike = typeof fetch;

export function getBugReportIssueConfig(
	env: IssueEnv = process.env,
): BugReportIssueConfig | null {
	const preferredProvider = env.BUG_REPORT_ISSUE_PROVIDER?.trim().toLowerCase();
	if (preferredProvider === "jira") return getJiraBugReportIssueConfig(env);
	if (preferredProvider === "github") return getGitHubBugReportIssueConfig(env);

	return getGitHubBugReportIssueConfig(env) ?? getJiraBugReportIssueConfig(env);
}

function getGitHubBugReportIssueConfig(
	env: IssueEnv,
): GitHubBugReportIssueConfig | null {
	const token = (env.BUG_REPORT_GITHUB_TOKEN || env.GITHUB_TOKEN)?.trim();
	const repository = (
		env.BUG_REPORT_GITHUB_REPOSITORY ||
		env.BUG_REPORT_GITHUB_REPO ||
		""
	).trim();

	if (!token || !repository) return null;

	return {
		provider: "github",
		token,
		repository,
		apiBaseUrl:
			env.BUG_REPORT_GITHUB_API_BASE_URL?.trim() || "https://api.github.com",
		labels: parseBugReportIssueLabels(env.BUG_REPORT_GITHUB_LABELS),
	};
}

function getJiraBugReportIssueConfig(
	env: IssueEnv,
): JiraBugReportIssueConfig | null {
	const token = (
		env.BUG_REPORT_JIRA_API_TOKEN ||
		env.BUG_REPORT_JIRA_TOKEN ||
		""
	).trim();
	const apiBaseUrl = (
		env.BUG_REPORT_JIRA_API_BASE_URL ||
		env.BUG_REPORT_JIRA_BASE_URL ||
		""
	).trim();
	const projectKey = (env.BUG_REPORT_JIRA_PROJECT_KEY || "").trim();

	if (!token || !apiBaseUrl || !projectKey) return null;

	return {
		provider: "jira",
		token,
		email: env.BUG_REPORT_JIRA_EMAIL?.trim() || undefined,
		apiBaseUrl,
		projectKey,
		issueType: env.BUG_REPORT_JIRA_ISSUE_TYPE?.trim() || "Bug",
		labels: parseBugReportIssueLabels(env.BUG_REPORT_JIRA_LABELS),
	};
}

export function isBugReportIssueCreationConfigured(
	env: IssueEnv = process.env,
) {
	return Boolean(getBugReportIssueConfig(env));
}

export function parseBugReportIssueLabels(value?: string) {
	const labels = (value || "bug,reported-from-gnd")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

	return Array.from(new Set(labels));
}

export function buildBugReportIssueTitle(input: BugReportIssueInput) {
	const base = input.title.trim() || input.description?.trim() || "Bug report";
	return `[GND Bug] ${base.slice(0, 120)}`;
}

function formatBugReportIssueSubmitter(
	createdBy: BugReportIssueInput["createdBy"],
) {
	if (!createdBy?.name && !createdBy?.email) return null;
	if (createdBy.name && createdBy.email) {
		return `${createdBy.name} <${createdBy.email}>`;
	}
	return createdBy.name || createdBy.email || null;
}

export function buildBugReportIssueBody(input: BugReportIssueInput) {
	const submitter = formatBugReportIssueSubmitter(input.createdBy);
	const lines = [
		`Bug report id: ${input.id}`,
		input.captureType ? `Capture type: ${input.captureType}` : null,
		input.currentUrl ? `Page URL: ${input.currentUrl}` : null,
		input.evidenceUrl ? `Evidence: ${input.evidenceUrl}` : null,
		submitter ? `Submitted by: ${submitter}` : null,
		input.description ? `\nDescription:\n${input.description}` : null,
		input.transcriptionText
			? `\nVoice transcription:\n${input.transcriptionText}`
			: null,
	]
		.filter((line): line is string => Boolean(line))
		.join("\n");

	return `${lines}\n\nCreated automatically from the GND web bug report tool.`;
}

type JiraDescriptionNode = {
	type: "paragraph";
	content: Array<{
		type: "text";
		text: string;
	}>;
};

export function buildJiraDescriptionDocument(input: BugReportIssueInput) {
	const body = buildBugReportIssueBody(input);
	const content = body.split("\n").map((line): JiraDescriptionNode => {
		return {
			type: "paragraph",
			content: line ? [{ type: "text", text: line }] : [],
		};
	});

	return {
		type: "doc",
		version: 1,
		content,
	};
}

function getJiraAuthorizationHeader(config: JiraBugReportIssueConfig) {
	if (config.email) {
		return `Basic ${btoa(`${config.email}:${config.token}`)}`;
	}
	return `Bearer ${config.token}`;
}

export async function createBugReportExternalIssue(
	input: BugReportIssueInput,
	options?: {
		config?: BugReportIssueConfig | null;
		fetcher?: FetchLike;
	},
): Promise<BugReportIssueResult> {
	const config = options?.config ?? getBugReportIssueConfig();
	if (!config) {
		throw new Error("Bug report issue creation is not configured.");
	}

	if (config.provider === "jira") {
		return createJiraBugReportIssue(input, config, options?.fetcher ?? fetch);
	}

	return createGitHubBugReportIssue(input, config, options?.fetcher ?? fetch);
}

async function createGitHubBugReportIssue(
	input: BugReportIssueInput,
	config: GitHubBugReportIssueConfig,
	fetcher: FetchLike,
): Promise<BugReportIssueResult> {
	const response = await fetcher(
		`${config.apiBaseUrl.replace(/\/$/, "")}/repos/${config.repository}/issues`,
		{
			method: "POST",
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${config.token}`,
				"Content-Type": "application/json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
			body: JSON.stringify({
				title: buildBugReportIssueTitle(input),
				body: buildBugReportIssueBody(input),
				labels: config.labels,
			}),
		},
	);
	const payload = (await response.json().catch(() => null)) as {
		number?: number;
		html_url?: string;
		message?: string;
	} | null;

	if (!response.ok) {
		throw new Error(payload?.message || "GitHub issue creation failed.");
	}

	if (!payload?.number || !payload.html_url) {
		throw new Error("GitHub issue creation returned incomplete issue data.");
	}

	return {
		provider: "github",
		key: `#${payload.number}`,
		url: payload.html_url,
	};
}

async function createJiraBugReportIssue(
	input: BugReportIssueInput,
	config: JiraBugReportIssueConfig,
	fetcher: FetchLike,
): Promise<BugReportIssueResult> {
	const apiBaseUrl = config.apiBaseUrl.replace(/\/$/, "");
	const response = await fetcher(`${apiBaseUrl}/rest/api/3/issue`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: getJiraAuthorizationHeader(config),
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			fields: {
				project: {
					key: config.projectKey,
				},
				issuetype: {
					name: config.issueType,
				},
				summary: buildBugReportIssueTitle(input),
				description: buildJiraDescriptionDocument(input),
				labels: config.labels,
			},
		}),
	});
	const payload = (await response.json().catch(() => null)) as {
		key?: string;
		errorMessages?: string[];
		errors?: Record<string, string>;
	} | null;

	if (!response.ok) {
		const fieldErrors = payload?.errors
			? Object.values(payload.errors).filter(Boolean)
			: [];
		const message = [...(payload?.errorMessages ?? []), ...fieldErrors].join(
			" ",
		);
		throw new Error(message || "Jira issue creation failed.");
	}

	if (!payload?.key) {
		throw new Error("Jira issue creation returned incomplete issue data.");
	}

	return {
		provider: "jira",
		key: payload.key,
		url: `${apiBaseUrl}/browse/${payload.key}`,
	};
}
