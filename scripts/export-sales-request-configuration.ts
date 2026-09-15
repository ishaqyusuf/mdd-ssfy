import { PrismaClient } from "@gnd/db";
import { getSalesRequestConfigurationContext } from "../apps/api/src/services/sales-request-configuration-context";

const target = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)) {
	throw new Error("Configuration export requires the local database");
}
const argument = process.argv
	.slice(2)
	.find((value) => value.startsWith("--setting-id="));
const settingId = Number(argument?.split("=")[1]);
if (!Number.isSafeInteger(settingId) || settingId <= 0) {
	throw new Error(
		"Choose an explicit active sales setting with --setting-id=<id>",
	);
}

const db = new PrismaClient();
try {
	// A consistent read snapshot prevents concurrent edits mixing route/component versions.
	const snapshot = await db.$transaction(
		(tx) => getSalesRequestConfigurationContext(tx, { settingId }),
		{ isolationLevel: "RepeatableRead" },
	);
	// Exact compact model configuration; no prices, credentials, or customer data.
	console.log(snapshot.configurationJson);
} finally {
	await db.$disconnect();
}
