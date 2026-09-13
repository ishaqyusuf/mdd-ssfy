import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

const evaluationEntrypoints = [
	"scripts/run-sales-request-corpus.ts",
	"scripts/finalize-sales-request-benchmark.ts",
] as const;

const explicitRuntimeFiles = [
	"packages/sales/package.json",
	"packages/sales/src/sales-form-core.ts",
	"packages/settings/package.json",
	"bun.lock",
] as const;

function sha256(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

function repositoryPath(repositoryRoot: string, source: string) {
	if (source.startsWith("node_modules/") || source.startsWith("bun:")) {
		return null;
	}
	const absolute = isAbsolute(source)
		? source
		: resolve(repositoryRoot, source);
	const path = relative(repositoryRoot, absolute).replaceAll("\\", "/");
	if (!path || path === ".." || path.startsWith("../")) return null;
	return path;
}

async function bundledFirstPartySources(repositoryRoot: string) {
	const files = new Set<string>(explicitRuntimeFiles);
	for (const entrypoint of evaluationEntrypoints) {
		const outputDirectory = await mkdtemp(
			join(tmpdir(), "sales-request-runtime-lock-"),
		);
		try {
			const build = Bun.spawn({
				cmd: [
					process.execPath,
					"build",
					join(repositoryRoot, entrypoint),
					"--target=bun",
					"--sourcemap=external",
					`--outdir=${outputDirectory}`,
				],
				cwd: repositoryRoot,
				stdout: "ignore",
				stderr: "ignore",
			});
			if ((await build.exited) !== 0) {
				throw new Error(
					"Unable to resolve the Sales Request evaluation runtime",
				);
			}
			const sourceMapName = (await readdir(outputDirectory)).find((name) =>
				name.endsWith(".js.map"),
			);
			if (!sourceMapName) {
				throw new Error("Evaluation runtime source map is missing");
			}
			const sourceMap = JSON.parse(
				await readFile(join(outputDirectory, sourceMapName), "utf8"),
			) as {
				sources?: unknown;
			};
			if (!Array.isArray(sourceMap.sources)) {
				throw new Error("Evaluation runtime source map is missing its sources");
			}
			for (const source of sourceMap.sources) {
				if (typeof source !== "string") {
					throw new Error(
						"Evaluation runtime source map contains an invalid source",
					);
				}
				const path = repositoryPath(repositoryRoot, source);
				if (path) files.add(path);
			}
		} finally {
			await rm(outputDirectory, { recursive: true, force: true });
		}
	}
	return [...files].sort();
}

export async function buildSalesRequestEvaluationRuntimeLock(
	repositoryRoot: string,
) {
	const paths = await bundledFirstPartySources(repositoryRoot);
	if (!paths.includes("packages/sales/src/sales-form-core.ts")) {
		throw new Error(
			"Evaluation runtime lock is missing the native seed boundary",
		);
	}
	const files = await Promise.all(
		paths.map(async (path) => ({
			path,
			sha256: sha256(await readFile(join(repositoryRoot, path), "utf8")),
		})),
	);
	return `${JSON.stringify(
		{ schemaVersion: 1, bunVersion: Bun.version, files },
		null,
		2,
	)}\n`;
}

export async function assertSalesRequestEvaluationRuntimeLock(input: {
	repositoryRoot: string;
	archived: string;
}) {
	const current = await buildSalesRequestEvaluationRuntimeLock(
		input.repositoryRoot,
	);
	if (current !== input.archived) {
		throw new Error(
			"Evaluation runtime changed after the approval packet was prepared",
		);
	}
	return current;
}
