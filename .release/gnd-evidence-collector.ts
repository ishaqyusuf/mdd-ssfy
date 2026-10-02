import { execFileSync, spawnSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import type { GndProviderBundle } from "./gnd-provider-bundle";
import { MOBILE_TARGET, WEB_TARGETS } from "./gnd-provider-bundle";
import type {
	ReleaseFingerprint,
	ReleaseReceipt,
} from "./toolkit/9a324b2c4e759d4713375e7853ef7d791c357552/src/release/evidence";
import type {
	ExpoBuildRecord,
	ExpoChannelRecord,
	ExpoPlatform,
	ExpoUpdateRecord,
} from "./toolkit/9a324b2c4e759d4713375e7853ef7d791c357552/src/release/expo";
import { matchesAny } from "./toolkit/9a324b2c4e759d4713375e7853ef7d791c357552/src/release/manifest";
import type {
	ReleaseEnvironment,
	ReleaseManifest,
	ReleaseTarget,
} from "./toolkit/9a324b2c4e759d4713375e7853ef7d791c357552/src/release/plan";
import type { VercelDeploymentMetadata } from "./toolkit/9a324b2c4e759d4713375e7853ef7d791c357552/src/release/vercel";

type CollectorInput = {
	environment: ReleaseEnvironment;
	revision: string;
	repository: string;
	trustedRepository: string;
	outputPath: string;
	now?: Date;
};

type RawExpoBuild = Record<string, unknown>;
type RawGithubDeployment = Record<string, unknown>;
type RawGithubDeploymentStatus = Record<string, unknown>;

const SHA = /^[0-9a-f]{40}$/i;
const GITHUB_REPOSITORY = "ishaqyusuf/mdd-ssfy";
const EAS_CLI_VERSION = "24.8.0";
const GITHUB_ENVIRONMENT_BY_TARGET: Record<string, string> = {
	"dashboard-web": "gndprodesk",
};

function sha256(value: string | Buffer) {
	return createHash("sha256").update(value).digest("hex");
}

export function providerIso(value: unknown) {
	const milliseconds =
		typeof value === "number"
			? value < 1_000_000_000_000
				? value * 1000
				: value
			: typeof value === "string"
				? Date.parse(value)
				: Number.NaN;
	return Number.isFinite(milliseconds)
		? new Date(milliseconds).toISOString()
		: null;
}

function requiredSecret(name: string) {
	const value = process.env[name]?.trim();
	if (!value)
		throw new Error(`Release collector needs protected secret ${name}.`);
	return value;
}

function git(root: string, args: string[]) {
	return execFileSync("git", args, {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 16 * 1024 * 1024,
		stdio: ["ignore", "pipe", "ignore"],
	});
}

export function repositoryHasCommit(root: string, revision: string) {
	return (
		spawnSync("git", ["cat-file", "-e", `${revision}^{commit}`], {
			cwd: root,
			stdio: "ignore",
		}).status === 0
	);
}

function committedFiles(root: string, revision: string) {
	return git(root, ["ls-tree", "-r", "--name-only", revision])
		.split("\n")
		.filter(Boolean)
		.sort();
}

function fingerprintAt(
	root: string,
	revision: string,
	target: ReleaseTarget,
): ReleaseFingerprint {
	if (!SHA.test(revision))
		throw new Error("Provider revision is not a full Git SHA.");
	const patterns =
		target.kind === "mobile" && target.nativeCandidatePaths?.length
			? target.nativeCandidatePaths
			: target.sourcePaths;
	const files = committedFiles(root, revision).filter((path) =>
		matchesAny(path, patterns),
	);
	const hash = createHash("sha256");
	for (const path of files) {
		hash.update(path);
		hash.update("\0");
		hash.update(git(root, ["show", `${revision}:${path}`]));
		hash.update("\0");
	}
	return {
		kind:
			target.kind === "database"
				? "schema"
				: target.kind === "mobile"
					? "native"
					: "configuration",
		value: hash.digest("hex"),
	};
}

export async function providerErrorDetails(response: Response) {
	let code: string | null = null;
	try {
		const payload = (await response.clone().json()) as Record<string, unknown>;
		const error =
			payload.error && typeof payload.error === "object"
				? (payload.error as Record<string, unknown>)
				: null;
		const candidate = error?.code ?? payload.code;
		if (
			typeof candidate === "string" &&
			/^[a-z0-9_.:-]{1,64}$/i.test(candidate)
		)
			code = candidate;
	} catch {
		// Provider response bodies are optional and must never be logged wholesale.
	}
	return `HTTP ${response.status}${code ? ` (${code})` : ""}`;
}

async function providerJson<T = Record<string, unknown>>(
	url: URL,
	token: string,
	message: string,
	headers: Record<string, string> = {},
): Promise<T> {
	const response = await fetch(url, {
		headers: { ...headers, Authorization: `Bearer ${token}` },
	});
	if (!response.ok)
		throw new Error(`${message} ${await providerErrorDetails(response)}`);
	return (await response.json()) as T;
}

export function selectSuccessfulGithubDeploymentStatus(
	statuses: RawGithubDeploymentStatus[],
) {
	for (const status of statuses) {
		const creator =
			status.creator && typeof status.creator === "object"
				? (status.creator as Record<string, unknown>)
				: null;
		if (status.state !== "success" || creator?.login !== "vercel[bot]")
			continue;
		const value = status.environment_url ?? status.target_url;
		if (typeof value !== "string") continue;
		try {
			const url = new URL(value);
			if (
				url.protocol !== "https:" ||
				url.username ||
				url.password ||
				!url.hostname.endsWith(".vercel.app")
			)
				continue;
			const completedAt = providerIso(status.updated_at ?? status.created_at);
			if (!completedAt) continue;
			return { hostname: url.hostname, completedAt };
		} catch {}
	}
	return null;
}

async function githubVercelDeployment(
	targetId: string,
	environment: ReleaseEnvironment,
	githubToken: string,
	repository: string,
) {
	const project = GITHUB_ENVIRONMENT_BY_TARGET[targetId];
	if (!project)
		throw new Error(`GitHub deployment mapping is missing for ${targetId}.`);
	const githubEnvironment = `${environment === "production" ? "Production" : "Preview"} – ${project}`;
	const deploymentsUrl = new URL(
		`https://api.github.com/repos/${GITHUB_REPOSITORY}/deployments`,
	);
	deploymentsUrl.searchParams.set("environment", githubEnvironment);
	deploymentsUrl.searchParams.set("per_page", "100");
	const deployments = await providerJson<RawGithubDeployment[]>(
		deploymentsUrl,
		githubToken,
		`GitHub deployments are unavailable for ${targetId}.`,
		{
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
		},
	);
	if (!Array.isArray(deployments))
		throw new Error(`GitHub deployments are invalid for ${targetId}.`);
	for (const deployment of deployments) {
		const id = deployment.id;
		const revision = deployment.sha;
		const creator =
			deployment.creator && typeof deployment.creator === "object"
				? (deployment.creator as Record<string, unknown>)
				: null;
		if (
			(typeof id !== "number" && typeof id !== "string") ||
			typeof revision !== "string" ||
			!SHA.test(revision) ||
			deployment.environment !== githubEnvironment ||
			creator?.login !== "vercel[bot]"
		)
			continue;
		const statusesUrl = new URL(
			`https://api.github.com/repos/${GITHUB_REPOSITORY}/deployments/${id}/statuses`,
		);
		statusesUrl.searchParams.set("per_page", "100");
		const statuses = await providerJson<RawGithubDeploymentStatus[]>(
			statusesUrl,
			githubToken,
			`GitHub deployment statuses are unavailable for ${targetId}.`,
			{
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		);
		if (!Array.isArray(statuses)) continue;
		const selected = selectSuccessfulGithubDeploymentStatus(statuses);
		if (selected && repositoryHasCommit(repository, revision))
			return { ...selected, id, revision };
	}
	return null;
}

async function collectVercel(
	input: CollectorInput,
	manifest: ReleaseManifest,
	now: Date,
) {
	const deploymentIds: Record<string, string> = {};
	const deployments: VercelDeploymentMetadata[] = [];
	const domains: GndProviderBundle["vercel"]["domains"] = [];
	const receipts: ReleaseReceipt[] = [];
	const githubToken = requiredSecret("GND_RELEASE_GITHUB_TOKEN");

	for (const config of WEB_TARGETS) {
		const githubDeployment = await githubVercelDeployment(
			config.targetId,
			input.environment,
			githubToken,
			input.repository,
		);
		if (!githubDeployment) continue;
		const revision = githubDeployment.revision;
		const id = `vercel_${githubDeployment.id}`;
		const providerTarget =
			input.environment === "production" ? "production" : "preview";
		const target = manifest.targets.find((item) => item.id === config.targetId);
		if (!target)
			throw new Error(`Release target is missing for ${config.targetId}.`);
		const fingerprint = fingerprintAt(input.repository, revision, target);
		const completedAt = githubDeployment.completedAt;
		const deployment: VercelDeploymentMetadata = {
			id,
			projectId: config.projectId,
			readyState: "READY",
			target: providerTarget,
			url: githubDeployment.hostname,
			meta: { githubCommitSha: revision },
			gitSource: { sha: revision },
			readySubstate: input.environment === "production" ? "PROMOTED" : null,
		};
		deploymentIds[config.targetId] = id;
		deployments.push(deployment);
		if (input.environment === "production" && config.productionDomain) {
			domains.push({
				domain: config.productionDomain,
				assignment: { deploymentId: id, assignedAt: completedAt },
			});
		}
		receipts.push({
			version: 1,
			project: "gnd",
			targetId: config.targetId,
			targetKind: "web",
			environment: input.environment,
			revision,
			action: "web-deploy",
			fingerprint,
			provider: "vercel",
			deploymentId: id,
			result: "succeeded",
			completedAt,
		});
	}
	return { deploymentIds, deployments, domains, receipts };
}

function parseEnvUrl(value: string) {
	const url = new URL(value);
	url.password = "";
	return sha256(url.toString());
}

function collectDatabase(
	input: CollectorInput,
	manifest: ReleaseManifest,
	now: Date,
) {
	const databaseUrl = requiredSecret("GND_RELEASE_DATABASE_URL");
	const target = manifest.targets.find((item) => item.id === "database");
	if (!target) throw new Error("Database release target is missing.");
	const fingerprint = fingerprintAt(input.repository, input.revision, target);
	const executable = resolve(
		input.trustedRepository,
		"node_modules/.bin/prisma",
	);
	const candidateSchema = resolve(input.repository, "packages/db/src/schema");
	const result = spawnSync(
		executable,
		[
			"migrate",
			"diff",
			"--from-schema-datasource",
			candidateSchema,
			"--to-schema-datamodel",
			candidateSchema,
			"--exit-code",
		],
		{
			cwd: input.trustedRepository,
			env: {
				CI: "1",
				DATABASE_URL: databaseUrl,
				HOME: process.env.HOME,
				PATH: process.env.PATH,
			},
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
			maxBuffer: 2 * 1024 * 1024,
		},
	);
	if (result.status === 2) return null;
	if (result.status !== 0) {
		throw new Error("Database schema state could not be verified.");
	}
	return {
		version: 1,
		project: "gnd",
		targetId: "database",
		targetKind: "database",
		environment: input.environment,
		revision: input.revision,
		action: "db-push",
		fingerprint,
		provider: "planetscale",
		deploymentId: `schema_${parseEnvUrl(databaseUrl).slice(0, 32)}`,
		result: "succeeded",
		completedAt: now.toISOString(),
	} satisfies ReleaseReceipt;
}

function easJson(args: string[], repository: string) {
	const result = spawnSync(
		"bunx",
		[`eas-cli@${EAS_CLI_VERSION}`, ...args, "--json", "--non-interactive"],
		{
			cwd: resolve(repository, MOBILE_TARGET.appPath),
			env: {
				CI: "1",
				EXPO_TOKEN: requiredSecret("GND_RELEASE_EXPO_TOKEN"),
				HOME: process.env.HOME,
				PATH: process.env.PATH,
			},
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
			maxBuffer: 16 * 1024 * 1024,
		},
	);
	if (result.status !== 0)
		throw new Error("Expo provider metadata is unavailable.");
	return JSON.parse(result.stdout) as unknown;
}

function expoPlatform(value: unknown): ExpoPlatform | null {
	return value === "ANDROID" || value === "android"
		? "android"
		: value === "IOS" || value === "ios"
			? "ios"
			: null;
}

function collectExpo(
	input: CollectorInput,
	manifest: ReleaseManifest,
	now: Date,
) {
	const profile = MOBILE_TARGET[input.environment].profile;
	const target = manifest.targets.find((item) => item.id === "mobile");
	if (!target) throw new Error("Mobile release target is missing.");
	const currentNative = fingerprintAt(
		input.repository,
		input.revision,
		target,
	).value;
	const currentFingerprints: Record<ExpoPlatform, string | null> = {
		android: currentNative,
		ios: currentNative,
	};
	const runtimeVersions: Record<ExpoPlatform, string | null> = {
		android: null,
		ios: null,
	};
	const raw = easJson(
		[
			"build:list",
			"--platform",
			"all",
			"--build-profile",
			profile,
			"--limit",
			"50",
		],
		input.trustedRepository,
	);
	const builds: ExpoBuildRecord[] = [];
	const buildCompletedAt = new Map<string, string>();
	for (const item of Array.isArray(raw) ? (raw as RawExpoBuild[]) : []) {
		const platform = expoPlatform(item.platform);
		const project =
			item.project && typeof item.project === "object"
				? (item.project as Record<string, unknown>)
				: {};
		if (
			!platform ||
			typeof item.id !== "string" ||
			typeof item.gitCommitHash !== "string" ||
			!SHA.test(item.gitCommitHash) ||
			typeof item.runtimeVersion !== "string"
		)
			continue;
		let fingerprint: string;
		try {
			fingerprint = fingerprintAt(
				input.repository,
				item.gitCommitHash,
				target,
			).value;
		} catch {
			continue;
		}
		const artifacts =
			item.artifacts && typeof item.artifacts === "object"
				? (item.artifacts as Record<string, unknown>)
				: {};
		builds.push({
			id: item.id,
			projectId: String(project.id ?? ""),
			platform,
			profile: String(item.buildProfile ?? ""),
			channel: String(item.channel ?? ""),
			revision: item.gitCommitHash,
			runtimeVersion: item.runtimeVersion,
			fingerprint,
			status:
				item.status === "FINISHED"
					? "finished"
					: item.status === "ERRORED"
						? "failed"
						: "pending",
			availability:
				typeof artifacts.buildUrl === "string" ? "available" : "unavailable",
		});
		const completedAt = providerIso(item.completedAt);
		if (completedAt && Date.parse(completedAt) <= now.getTime()) {
			buildCompletedAt.set(item.id, completedAt);
		}
	}
	const baselineBuildIds: Partial<Record<ExpoPlatform, string>> = {};
	for (const platform of MOBILE_TARGET.platforms) {
		const build = builds.find(
			(item) =>
				item.platform === platform &&
				item.profile === profile &&
				item.channel === MOBILE_TARGET[input.environment].channel &&
				item.status === "finished" &&
				item.availability === "available",
		);
		if (build) {
			baselineBuildIds[platform] = build.id;
			runtimeVersions[platform] = build.runtimeVersion;
		}
	}
	const commonRevision = builds.find(
		(item) =>
			item.profile === profile &&
			item.channel === MOBILE_TARGET[input.environment].channel &&
			MOBILE_TARGET.platforms.every((platform) =>
				builds.some(
					(candidate) =>
						candidate.platform === platform &&
						candidate.profile === profile &&
						candidate.channel === MOBILE_TARGET[input.environment].channel &&
						candidate.revision === item.revision &&
						candidate.status === "finished" &&
						candidate.availability === "available",
				),
			),
	)?.revision;
	let receipt: ReleaseReceipt | null = null;
	const newBuildIds: Partial<Record<ExpoPlatform, string>> = {};
	for (const platform of MOBILE_TARGET.platforms) {
		const currentBuild = builds.find(
			(item) =>
				item.platform === platform &&
				item.revision === input.revision &&
				item.profile === profile &&
				item.channel === MOBILE_TARGET[input.environment].channel &&
				item.status === "finished" &&
				item.availability === "available",
		);
		if (currentBuild) {
			newBuildIds[platform] = currentBuild.id;
			runtimeVersions[platform] = currentBuild.runtimeVersion;
		}
	}
	if (commonRevision) {
		const platformBuilds = MOBILE_TARGET.platforms.map((platform) =>
			builds.find(
				(item) =>
					item.platform === platform &&
					item.profile === profile &&
					item.channel === MOBILE_TARGET[input.environment].channel &&
					item.revision === commonRevision &&
					item.status === "finished" &&
					item.availability === "available",
			),
		);
		if (platformBuilds.some((item) => !item)) {
			throw new Error("Expo common build baseline is internally inconsistent.");
		}
		const completePlatformBuilds = platformBuilds as ExpoBuildRecord[];
		const completionTimes = completePlatformBuilds
			.map((item) => buildCompletedAt.get(item.id))
			.filter((value): value is string => Boolean(value));
		if (completionTimes.length !== completePlatformBuilds.length) {
			throw new Error("Expo build completion metadata is unavailable.");
		}
		const completedAt = completionTimes.sort().at(-1);
		if (!completedAt) throw new Error("Expo completion time is unavailable.");
		receipt = {
			version: 1,
			project: "gnd",
			targetId: "mobile",
			targetKind: "mobile",
			environment: input.environment,
			revision: commonRevision,
			action: "mobile-build",
			fingerprint: {
				kind: "native",
				value: sha256(
					JSON.stringify(
						completePlatformBuilds.map((item) => [
							item.platform,
							item.fingerprint,
						]),
					),
				),
			},
			provider: "expo",
			deploymentId: `build_${sha256(completePlatformBuilds.map((item) => item.id).join(":")).slice(0, 32)}`,
			result: "succeeded",
			completedAt,
		};
	}
	const channelName = MOBILE_TARGET[input.environment].channel;
	const branchName = MOBILE_TARGET[input.environment].branch;
	const channelRaw = easJson(
		["channel:view", channelName],
		input.trustedRepository,
	) as Record<string, unknown>;
	const currentPage =
		channelRaw.currentPage && typeof channelRaw.currentPage === "object"
			? (channelRaw.currentPage as Record<string, unknown>)
			: {};
	const branches = Array.isArray(currentPage.updateBranches)
		? (currentPage.updateBranches as Array<Record<string, unknown>>)
		: [];
	const linkedBranch = branches.find((item) => item.name === branchName);
	const updates: ExpoUpdateRecord[] = [];
	const updateCompletedAt = new Map<string, string>();
	if (linkedBranch && Array.isArray(linkedBranch.updateGroups)) {
		for (const group of linkedBranch.updateGroups) {
			for (const item of Array.isArray(group) ? group : []) {
				if (!item || typeof item !== "object") continue;
				const update = item as Record<string, unknown>;
				const platform = expoPlatform(update.platform);
				if (
					!platform ||
					typeof update.group !== "string" ||
					typeof update.gitCommitHash !== "string" ||
					!SHA.test(update.gitCommitHash) ||
					typeof update.runtimeVersion !== "string"
				)
					continue;
				updates.push({
					groupId: update.group,
					projectId: MOBILE_TARGET.projectId,
					platform,
					channel: channelName,
					branch: branchName,
					revision: update.gitCommitHash,
					runtimeVersion: update.runtimeVersion,
					status: "published",
					rolloutPercentage: 100,
				});
				const completedAt = providerIso(update.createdAt ?? update.updatedAt);
				if (completedAt && Date.parse(completedAt) <= now.getTime()) {
					updateCompletedAt.set(update.group, completedAt);
				}
			}
		}
	}
	const channels: ExpoChannelRecord[] = linkedBranch
		? [
				{
					projectId: MOBILE_TARGET.projectId,
					channel: channelName,
					branch: branchName,
				},
			]
		: [];
	const updateGroupIds: Partial<Record<ExpoPlatform, string>> = {};
	const currentGroup = updates.find(
		(item) =>
			item.revision === input.revision &&
			MOBILE_TARGET.platforms.every((platform) =>
				updates.some(
					(candidate) =>
						candidate.groupId === item.groupId &&
						candidate.platform === platform &&
						candidate.revision === input.revision,
				),
			),
	)?.groupId;
	if (currentGroup) {
		for (const platform of MOBILE_TARGET.platforms) {
			updateGroupIds[platform] = currentGroup;
			const update = updates.find(
				(item) => item.groupId === currentGroup && item.platform === platform,
			);
			if (update) runtimeVersions[platform] = update.runtimeVersion;
		}
		const completion = updateCompletedAt.get(currentGroup);
		if (completion && currentFingerprints.android && currentFingerprints.ios) {
			receipt = {
				version: 1,
				project: "gnd",
				targetId: "mobile",
				targetKind: "mobile",
				environment: input.environment,
				revision: input.revision,
				action: "mobile-update",
				fingerprint: {
					kind: "native",
					value: sha256(
						JSON.stringify([
							["android", currentFingerprints.android],
							["ios", currentFingerprints.ios],
						]),
					),
				},
				provider: "expo",
				deploymentId: `update_${sha256(currentGroup).slice(0, 32)}`,
				result: "succeeded",
				completedAt: completion,
			};
		}
	}
	return {
		builds,
		baselineBuildIds,
		receipt,
		newBuildIds,
		updateGroupIds,
		fingerprints: currentFingerprints,
		runtimeVersions,
		updates,
		channels,
	};
}

export async function collectGndEvidence(input: CollectorInput) {
	if (!SHA.test(input.revision))
		throw new Error("Release collector needs a full Git SHA.");
	const head = git(input.repository, ["rev-parse", "HEAD"]).trim();
	if (head !== input.revision)
		throw new Error("Release collector checkout is stale.");
	const manifest = JSON.parse(
		readFileSync(
			resolve(input.trustedRepository, "release.manifest.json"),
			"utf8",
		),
	) as ReleaseManifest;
	const now = input.now ?? new Date();
	const web = await collectVercel(input, manifest, now);
	const database = collectDatabase(input, manifest, now);
	const expo = collectExpo(input, manifest, now);
	const currentFingerprints = Object.fromEntries(
		manifest.targets.map((target) => [
			target.id,
			fingerprintAt(input.repository, input.revision, target),
		]),
	);
	if (expo.fingerprints.android && expo.fingerprints.ios) {
		currentFingerprints.mobile = {
			kind: "native",
			value: sha256(
				JSON.stringify([
					["android", expo.fingerprints.android],
					["ios", expo.fingerprints.ios],
				]),
			),
		};
	}
	const receipts = [
		...(database ? [database] : []),
		...web.receipts,
		...(expo.receipt ? [expo.receipt] : []),
	];
	const evidence = receipts.map(({ version: _version, ...receipt }) => receipt);
	const liveState = receipts.map((receipt) => ({
		project: receipt.project,
		targetId: receipt.targetId,
		targetKind: receipt.targetKind,
		environment: receipt.environment,
		revision: receipt.revision,
		provider: receipt.provider,
		deploymentId: receipt.deploymentId,
		fingerprint: receipt.fingerprint,
		active: true,
		observedAt: now.toISOString(),
	}));
	const bundle: GndProviderBundle = {
		version: 1,
		project: "gnd",
		environment: input.environment,
		revision: input.revision,
		generatedAt: now.toISOString(),
		receipts,
		evidence,
		liveState,
		fingerprints: currentFingerprints,
		vercel: {
			deploymentIds: web.deploymentIds,
			deployments: web.deployments,
			domains: web.domains,
			promotionGates: [],
		},
		expo: {
			fingerprints: expo.fingerprints,
			runtimeVersions: expo.runtimeVersions,
			baselineBuildIds: expo.baselineBuildIds,
			newBuildIds: expo.newBuildIds,
			updateGroupIds: expo.updateGroupIds,
			builds: expo.builds,
			updates: expo.updates,
			channels: expo.channels,
		},
	};
	const key = requiredSecret("GND_RELEASE_EVIDENCE_HMAC_KEY");
	if (Buffer.byteLength(key) < 32)
		throw new Error("Release signing key is invalid.");
	const payload = Buffer.from(JSON.stringify(bundle)).toString("base64url");
	const envelope = JSON.stringify({
		version: 1,
		payload,
		signature: createHmac("sha256", key).update(payload).digest("hex"),
	});
	const output = resolve(input.trustedRepository, input.outputPath);
	if (relative(resolve(input.trustedRepository), output).startsWith("..")) {
		throw new Error("Signed evidence must stay in the trusted checkout.");
	}
	mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
	writeFileSync(output, envelope, { mode: 0o600 });
	return bundle;
}
