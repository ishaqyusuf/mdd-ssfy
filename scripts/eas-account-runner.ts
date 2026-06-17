import { access, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Action = "eas-build:dev" | "eas-build:preview" | "update:preview";
type CurrentIdentity = {
	email: string | null;
	username: string | null;
};
type EasAccount = {
	label: string;
	login: string;
	password: string;
	username: string | null;
};

const APP_DIR = path.join(import.meta.dir, "..", "apps", "expo-app");

const ACTION_COMMANDS: Record<Action, string[]> = {
	"eas-build:dev": ["bun", "run", "eas-build:dev"],
	"eas-build:preview": ["bun", "run", "eas-build:preview"],
	"update:preview": ["bun", "run", "update:preview"],
};

const action = process.argv[2] as Action | undefined;

if (!action || !(action in ACTION_COMMANDS)) {
	console.error(getUsage());
	process.exit(1);
}

const env = { ...Bun.env };
env.EXPO_TOKEN = undefined;

const account = resolveAccount(action, env, process.argv.slice(3));

const desiredIdentifiers = new Set(
	[account.login.toLowerCase(), account.username?.toLowerCase()].filter(
		Boolean,
	),
);

const currentIdentity = await getCurrentIdentity();
const currentUsername = currentIdentity.username;
const currentEmail = currentIdentity.email?.toLowerCase() ?? null;

if (
	(currentEmail && currentEmail === account.login.toLowerCase()) ||
	(currentUsername && desiredIdentifiers.has(currentUsername.toLowerCase()))
) {
	console.log(
		`EAS session already matches ${currentEmail ?? currentUsername ?? account.login}.`,
	);
} else {
	if (currentUsername) {
		console.log(
			`Current EAS session is ${currentUsername}. Switching to ${account.label}.`,
		);
	} else {
		console.log(
			`No active EAS session found. Logging in with ${account.label}.`,
		);
	}

	const session = await loginWithEmailAndPassword(
		account.login,
		account.password,
	);
	await writeExpoSession(session);
	console.log(`Authenticated EAS session as ${session.username}.`);
}

await runOrExit(ACTION_COMMANDS[action], {
	cwd: APP_DIR,
	env,
	stdio: "inherit",
});

function resolveAccount(
	actionValue: Action,
	sourceEnv: NodeJS.ProcessEnv,
	args: string[],
): EasAccount {
	const selectedAccount = getAccountSelector(args, sourceEnv);
	const actionPrefix = toEnvKey(actionValue);
	const selectedPrefix = selectedAccount ? toEnvKey(selectedAccount) : null;
	const prefixes = selectedPrefix
		? [`EAS_${selectedPrefix}`]
		: [`EAS_${actionPrefix}`, "EAS_PREVIEW", "EAS"];

	const login =
		getFirstEnv(
			sourceEnv,
			prefixes.flatMap((prefix) => [`${prefix}_EMAIL`, `${prefix}_LOGIN`]),
		) ?? null;
	const password = getFirstEnv(
		sourceEnv,
		prefixes.map((prefix) => `${prefix}_PASSWORD`),
	);
	const username =
		getFirstEnv(
			sourceEnv,
			prefixes.map((prefix) => `${prefix}_USERNAME`),
		) ?? null;

	if (!login || !password) {
		console.error(
			[
				`Missing EAS credentials for ${selectedAccount ?? actionValue}.`,
				"",
				"Set EAS_EMAIL/EAS_PASSWORD, or choose a named account with:",
				"  EAS_ACCOUNT=work EAS_WORK_EMAIL=... EAS_WORK_PASSWORD=...",
				"  bun run eas-build:preview -- --account work",
			].join("\n"),
		);
		process.exit(1);
	}

	return {
		label: username ?? login,
		login,
		password,
		username,
	};
}

function getAccountSelector(
	args: string[],
	sourceEnv: NodeJS.ProcessEnv,
): string | null {
	const accountFlagIndex = args.findIndex(
		(arg) => arg === "--account" || arg === "-a",
	);
	const accountEquals = args.find((arg) => arg.startsWith("--account="));

	if (accountFlagIndex >= 0) {
		return args[accountFlagIndex + 1]?.trim() || null;
	}

	if (accountEquals) {
		return accountEquals.split("=").slice(1).join("=").trim() || null;
	}

	return sourceEnv.EAS_ACCOUNT?.trim() || null;
}

function getFirstEnv(
	sourceEnv: NodeJS.ProcessEnv,
	keys: string[],
): string | undefined {
	for (const key of keys) {
		const value = sourceEnv[key]?.trim();

		if (value) {
			return value;
		}
	}
}

function toEnvKey(value: string): string {
	return value
		.replace(/[^a-zA-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.toUpperCase();
}

function getUsage(): string {
	return [
		"Usage: bun ./scripts/eas-account-runner.ts <eas-build:dev|eas-build:preview|update:preview> [--account <name>]",
		"",
		"Default credentials:",
		"  EAS_EMAIL or EAS_LOGIN",
		"  EAS_PASSWORD",
		"  EAS_USERNAME optional",
		"",
		"Named account credentials:",
		"  EAS_ACCOUNT=work",
		"  EAS_WORK_EMAIL or EAS_WORK_LOGIN",
		"  EAS_WORK_PASSWORD",
		"  EAS_WORK_USERNAME optional",
	].join("\n");
}

async function getCurrentIdentity(): Promise<CurrentIdentity> {
	const sessionSecret = await readSessionSecret();

	if (!sessionSecret) {
		return { email: null, username: null };
	}

	try {
		const easCliRoot = await resolveEasCliRoot();
		const createGraphqlClientModule = (await import(
			pathToFileURL(
				path.join(
					easCliRoot,
					"build",
					"commandUtils",
					"context",
					"contextUtils",
					"createGraphqlClient.js",
				),
			).href
		)) as {
			createGraphqlClient: (authInfo: {
				accessToken: string | null;
				sessionSecret: string | null;
			}) => {
				query: (
					query: string,
					variables: Record<string, never>,
				) => {
					toPromise: () => Promise<unknown>;
				};
			};
		};
		const clientModule = (await import(
			pathToFileURL(path.join(easCliRoot, "build", "graphql", "client.js")).href
		)) as {
			withErrorHandlingAsync: <T>(promise: Promise<T>) => Promise<{
				meActor: {
					__typename?: string;
					username?: string;
					email?: string;
				} | null;
			}>;
		};

		const client = createGraphqlClientModule.createGraphqlClient({
			accessToken: null,
			sessionSecret,
		});

		const data = await clientModule.withErrorHandlingAsync(
			client
				.query(
					`
						query CurrentIdentity {
							meActor {
								__typename
								... on User {
									username
									email
								}
								... on SSOUser {
									username
								}
							}
						}
					`,
					{},
				)
				.toPromise(),
		);

		return {
			email: data.meActor?.email ?? null,
			username: data.meActor?.username ?? null,
		};
	} catch {
		return { email: null, username: null };
	}
}

async function loginWithEmailAndPassword(
	emailValue: string,
	passwordValue: string,
) {
	const easCliRoot = await resolveEasCliRoot();
	const modulePath = path.join(
		easCliRoot,
		"build",
		"user",
		"fetchSessionSecretAndUser.js",
	);

	const module = (await import(pathToFileURL(modulePath).href)) as {
		fetchSessionSecretAndUserAsync: (input: {
			username: string;
			password: string;
			otp?: string;
		}) => Promise<{ sessionSecret: string; id: string; username: string }>;
	};

	return await module.fetchSessionSecretAndUserAsync({
		username: emailValue,
		password: passwordValue,
	});
}

async function writeExpoSession(session: {
	sessionSecret: string;
	id: string;
	username: string;
}): Promise<void> {
	const statePath = path.join(Bun.env.HOME ?? "", ".expo", "state.json");

	if (!Bun.env.HOME) {
		throw new Error(
			"HOME is not set, so the Expo session path cannot be resolved.",
		);
	}

	await mkdir(path.dirname(statePath), { recursive: true });

	let state: Record<string, unknown> = {};

	try {
		state = JSON.parse(await readFile(statePath, "utf8")) as Record<
			string,
			unknown
		>;
	} catch (error) {
		const isMissingFile =
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT";

		if (!isMissingFile) {
			throw error;
		}
	}

	state.auth = {
		sessionSecret: session.sessionSecret,
		userId: session.id,
		username: session.username,
		currentConnection: "Username-Password-Authentication",
	};

	await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function readSessionSecret(): Promise<string | null> {
	const statePath = path.join(Bun.env.HOME ?? "", ".expo", "state.json");

	if (!Bun.env.HOME) {
		return null;
	}

	try {
		const state = JSON.parse(await readFile(statePath, "utf8")) as {
			auth?: { sessionSecret?: string };
		};

		return state.auth?.sessionSecret ?? null;
	} catch (error) {
		const isMissingFile =
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT";

		if (isMissingFile) {
			return null;
		}

		throw error;
	}
}

async function resolveEasCliRoot(): Promise<string> {
	const easBinary = Bun.which("eas");

	if (!easBinary) {
		throw new Error("The `eas` command was not found in PATH.");
	}

	const basedir = path.dirname(easBinary);
	const resolvedBinary = await resolveRealpathSafe(easBinary);
	const resolvedBasedir = path.dirname(resolvedBinary);
	const wrapperCandidates = [
		...(await collectWrapperCandidates(easBinary, basedir)),
		...(await collectWrapperCandidates(resolvedBinary, resolvedBasedir)),
	];
	const candidates = [
		...collectAncestorCandidates(easBinary),
		...collectAncestorCandidates(resolvedBinary),
		...wrapperCandidates,
	].filter((candidate, index, all) => all.indexOf(candidate) === index);

	for (const candidate of candidates) {
		try {
			if (await isEasCliRoot(candidate)) {
				return candidate;
			}
		} catch {
			// Keep trying the next detected wrapper path.
		}
	}

	throw new Error(
		`Unable to resolve the installed eas-cli package path from ${easBinary}.`,
	);
}

function normalizeWrapperPath(candidate: string, basedir: string): string {
	const resolved = candidate.replaceAll("$basedir", basedir);
	return path.isAbsolute(resolved) ? resolved : path.resolve(basedir, resolved);
}

function collectAncestorCandidates(binaryPath: string): string[] {
	const candidates: string[] = [];
	let currentDir = path.dirname(binaryPath);

	while (true) {
		candidates.push(currentDir);

		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) {
			break;
		}

		currentDir = parentDir;
	}

	return candidates;
}

async function collectWrapperCandidates(
	binaryPath: string,
	basedir: string,
): Promise<string[]> {
	try {
		const wrapper = await readFile(binaryPath, "utf8");
		return [
			...wrapper.matchAll(/["']([^"']*node_modules\/eas-cli)\/bin\/run["']/g),
			...wrapper.matchAll(
				/["']([^"']*node_modules\/eas-cli)\/bin\/node_modules/g,
			),
			...wrapper.matchAll(/["']([^"']*node_modules\/eas-cli)\/node_modules/g),
		].map((match) => normalizeWrapperPath(match[1], basedir));
	} catch {
		return [];
	}
}

async function isEasCliRoot(candidate: string): Promise<boolean> {
	const packageJsonPath = path.join(candidate, "package.json");
	const runPath = path.join(candidate, "bin", "run");
	const buildPath = path.join(candidate, "build");

	try {
		await access(runPath);
		await access(buildPath);
	} catch {
		return false;
	}

	try {
		const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
			name?: string;
		};

		return packageJson.name === "eas-cli";
	} catch {
		return false;
	}
}

async function resolveRealpathSafe(filePath: string): Promise<string> {
	try {
		return await realpath(filePath);
	} catch {
		return filePath;
	}
}

async function runOrExit(
	cmd: string[],
	options: { cwd: string; env: NodeJS.ProcessEnv; stdio: "inherit" | "pipe" },
): Promise<void> {
	const proc = Bun.spawn({
		cmd,
		cwd: options.cwd,
		env: options.env,
		stdin: "inherit",
		stdout: options.stdio,
		stderr: options.stdio,
	});

	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		process.exit(exitCode);
	}
}
