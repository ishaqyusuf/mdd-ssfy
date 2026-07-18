import { describe, expect, test } from "bun:test";
import {
	buildBugReportIssueBody,
	buildBugReportIssueTitle,
	buildJiraDescriptionDocument,
	createBugReportExternalIssue,
	getBugReportIssueConfig,
	parseBugReportIssueLabels,
} from "./bug-report-issue";

describe("bug report issue helpers", () => {
	test("requires GitHub token and repository config", () => {
		expect(getBugReportIssueConfig({})).toBeNull();
		expect(
			getBugReportIssueConfig({
				BUG_REPORT_GITHUB_TOKEN: "token",
				BUG_REPORT_GITHUB_REPOSITORY: "owner/repo",
			}),
		).toMatchObject({
			provider: "github",
			repository: "owner/repo",
			labels: ["bug", "reported-from-gnd"],
		});
	});

	test("supports Jira issue config when selected", () => {
		expect(
			getBugReportIssueConfig({
				BUG_REPORT_ISSUE_PROVIDER: "jira",
				BUG_REPORT_JIRA_API_TOKEN: "jira-token",
				BUG_REPORT_JIRA_EMAIL: "ava@example.com",
				BUG_REPORT_JIRA_BASE_URL: "https://gnd.atlassian.net",
				BUG_REPORT_JIRA_PROJECT_KEY: "GND",
				BUG_REPORT_JIRA_ISSUE_TYPE: "Task",
				BUG_REPORT_JIRA_LABELS: "bug, support, bug",
			}),
		).toMatchObject({
			provider: "jira",
			apiBaseUrl: "https://gnd.atlassian.net",
			projectKey: "GND",
			issueType: "Task",
			labels: ["bug", "support"],
		});
	});

	test("dedupes configured issue labels", () => {
		expect(parseBugReportIssueLabels("bug, support, bug,")).toEqual([
			"bug",
			"support",
		]);
	});

	test("builds a bounded issue title and evidence-rich body", () => {
		const input = {
			id: "bug_123",
			title: "The checkout button disappears behind the payment sheet",
			description: "I cannot submit payment from the checkout page.",
			currentUrl: "https://gndprodesk.localhost:3011/sales-book/orders",
			captureType: "SCREENSHOT",
			evidenceUrl: "https://blob.example.com/screenshot.png",
			transcriptionText: "The checkout button is hidden.",
			createdBy: {
				name: "Ava",
				email: "ava@example.com",
			},
		};

		expect(buildBugReportIssueTitle(input)).toBe(
			"[GND Bug] The checkout button disappears behind the payment sheet",
		);
		expect(buildBugReportIssueBody(input)).toContain("Bug report id: bug_123");
		expect(buildBugReportIssueBody(input)).toContain(
			"Capture type: SCREENSHOT",
		);
		expect(buildBugReportIssueBody(input)).toContain(
			"Voice transcription:\nThe checkout button is hidden.",
		);
		expect(buildBugReportIssueBody(input)).toContain(
			"Submitted by: Ava <ava@example.com>",
		);
		expect(
			buildBugReportIssueBody({
				id: "bug_124",
				title: "Missing date",
				createdBy: { email: "ava@example.com" },
			}),
		).toContain("Submitted by: ava@example.com");
		const jiraDescription = buildJiraDescriptionDocument(input);
		expect(jiraDescription).toMatchObject({
			type: "doc",
			version: 1,
		});
		expect(jiraDescription.content[0]).toEqual({
			type: "paragraph",
			content: [{ type: "text", text: "Bug report id: bug_123" }],
		});
	});

	test("creates GitHub issues through the configured repository", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: url.toString(), init });

			return Response.json({
				number: 42,
				html_url: "https://github.com/owner/repo/issues/42",
			});
		};

		const result = await createBugReportExternalIssue(
			{
				id: "bug_123",
				title: "Hidden submit button",
				description: "The submit button is hidden.",
			},
			{
				config: {
					provider: "github",
					token: "github-secret",
					repository: "owner/repo",
					apiBaseUrl: "https://api.github.test",
					labels: ["bug"],
				},
				fetcher: fetcher as typeof fetch,
			},
		);

		expect(result).toEqual({
			provider: "github",
			key: "#42",
			url: "https://github.com/owner/repo/issues/42",
		});
		expect(calls[0]?.url).toBe(
			"https://api.github.test/repos/owner/repo/issues",
		);
		expect(calls[0]?.init?.method).toBe("POST");
		expect(calls[0]?.init?.headers).toEqual({
			Accept: "application/vnd.github+json",
			Authorization: "Bearer github-secret",
			"Content-Type": "application/json",
			"X-GitHub-Api-Version": "2022-11-28",
		});
		expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({
			title: "[GND Bug] Hidden submit button",
			labels: ["bug"],
		});
	});

	test("surfaces GitHub issue creation errors", async () => {
		const fetcher = async (_url: string | URL | Request, _init?: RequestInit) =>
			Response.json({ message: "Bad credentials" }, { status: 401 });

		await expect(
			createBugReportExternalIssue(
				{
					id: "bug_123",
					title: "Hidden submit button",
				},
				{
					config: {
						provider: "github",
						token: "bad-secret",
						repository: "owner/repo",
						apiBaseUrl: "https://api.github.test",
						labels: ["bug"],
					},
					fetcher: fetcher as typeof fetch,
				},
			),
		).rejects.toThrow("Bad credentials");
	});

	test("creates Jira issues through the configured project", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: url.toString(), init });

			return Response.json({
				key: "GND-123",
			});
		};

		const result = await createBugReportExternalIssue(
			{
				id: "bug_123",
				title: "Hidden submit button",
				description: "The submit button is hidden.",
				currentUrl: "https://gndprodesk.localhost:3011/sales-book/orders",
			},
			{
				config: {
					provider: "jira",
					token: "jira-secret",
					email: "ava@example.com",
					apiBaseUrl: "https://gnd.atlassian.net/",
					projectKey: "GND",
					issueType: "Bug",
					labels: ["bug"],
				},
				fetcher: fetcher as typeof fetch,
			},
		);

		expect(result).toEqual({
			provider: "jira",
			key: "GND-123",
			url: "https://gnd.atlassian.net/browse/GND-123",
		});
		expect(calls[0]?.url).toBe("https://gnd.atlassian.net/rest/api/3/issue");
		expect(calls[0]?.init?.method).toBe("POST");
		expect(calls[0]?.init?.headers).toEqual({
			Accept: "application/json",
			Authorization: `Basic ${btoa("ava@example.com:jira-secret")}`,
			"Content-Type": "application/json",
		});
		expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({
			fields: {
				project: { key: "GND" },
				issuetype: { name: "Bug" },
				summary: "[GND Bug] Hidden submit button",
				labels: ["bug"],
				description: {
					type: "doc",
					version: 1,
				},
			},
		});
	});

	test("surfaces Jira issue creation errors", async () => {
		const fetcher = async (_url: string | URL | Request, _init?: RequestInit) =>
			Response.json(
				{
					errorMessages: ["Project is required."],
					errors: { summary: "Summary is required." },
				},
				{ status: 400 },
			);

		await expect(
			createBugReportExternalIssue(
				{
					id: "bug_123",
					title: "Hidden submit button",
				},
				{
					config: {
						provider: "jira",
						token: "bad-secret",
						apiBaseUrl: "https://gnd.atlassian.net",
						projectKey: "GND",
						issueType: "Bug",
						labels: ["bug"],
					},
					fetcher: fetcher as typeof fetch,
				},
			),
		).rejects.toThrow("Project is required. Summary is required.");
	});
});
