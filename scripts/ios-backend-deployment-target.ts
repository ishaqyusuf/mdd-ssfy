import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const IOS_BACKEND_DEPLOYMENT_TARGET = {
	projectId: "prj_BbeTM6D2N5TkqWW9SzaZvdXBPnsr",
	projectName: "gndprodesk",
	rootDirectory: "apps/dashboard",
} as const;

type VercelProjectLink = {
	projectId?: unknown;
	projectName?: unknown;
};

export type DeploymentTargetCheck = {
	ok: boolean;
	message: string;
};

export function validateDashboardProjectLink(
	link: VercelProjectLink,
): DeploymentTargetCheck[] {
	return [
		{
			ok: link.projectId === IOS_BACKEND_DEPLOYMENT_TARGET.projectId,
			message:
				link.projectId === IOS_BACKEND_DEPLOYMENT_TARGET.projectId
					? `Project ID matches ${IOS_BACKEND_DEPLOYMENT_TARGET.projectId}`
					: `Expected project ID ${IOS_BACKEND_DEPLOYMENT_TARGET.projectId}; received ${String(link.projectId ?? "missing")}`,
		},
		{
			ok: link.projectName === IOS_BACKEND_DEPLOYMENT_TARGET.projectName,
			message:
				link.projectName === IOS_BACKEND_DEPLOYMENT_TARGET.projectName
					? `Project name matches ${IOS_BACKEND_DEPLOYMENT_TARGET.projectName}`
					: `Expected project name ${IOS_BACKEND_DEPLOYMENT_TARGET.projectName}; received ${String(link.projectName ?? "missing")}`,
		},
	];
}

export function readProjectLink(projectFile: string): VercelProjectLink {
	if (!existsSync(projectFile)) {
		throw new Error(
			`Missing ${projectFile}. Authenticate to the authorized Vercel team, then link ${IOS_BACKEND_DEPLOYMENT_TARGET.rootDirectory} to ${IOS_BACKEND_DEPLOYMENT_TARGET.projectName} before requesting deployment approval.`,
		);
	}

	try {
		return JSON.parse(readFileSync(projectFile, "utf8")) as VercelProjectLink;
	} catch {
		throw new Error(`Unable to parse Vercel project link at ${projectFile}.`);
	}
}

export function runDeploymentTargetCheck(
	projectFile = resolve(
		import.meta.dir,
		"../apps/dashboard/.vercel/project.json",
	),
): DeploymentTargetCheck[] {
	return validateDashboardProjectLink(readProjectLink(projectFile));
}

if (import.meta.main) {
	const projectFileArgument = process.argv[2];
	const projectFile = projectFileArgument
		? resolve(process.cwd(), projectFileArgument)
		: undefined;

	try {
		const checks = runDeploymentTargetCheck(projectFile);
		for (const check of checks) {
			console.log(`${check.ok ? "PASS" : "FAIL"} ${check.message}`);
		}

		if (checks.some((check) => !check.ok)) {
			console.error(
				`Refusing iOS backend rollout preparation: the linked project is not ${IOS_BACKEND_DEPLOYMENT_TARGET.projectName}.`,
			);
			process.exitCode = 1;
		} else {
			console.log(
				`READY ${IOS_BACKEND_DEPLOYMENT_TARGET.rootDirectory} is linked to the approved iOS backend deployment target.`,
			);
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
