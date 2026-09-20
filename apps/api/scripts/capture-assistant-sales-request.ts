import { mkdir, open } from "node:fs/promises";
import { join } from "node:path";
import { createAssistantSalesRequestPreviewDependencies } from "../src/assistant/order-drafts";
import { getAssistantApiKey } from "../src/assistant/provider-controls";
import { db } from "@gnd/db";
import {
	createSalesRequestProvider,
	classifySalesRequestProviderFailure,
} from "../src/services/sales-request-provider";
import { generateNewSalesFormSeed } from "../src/services/sales-request-generation";

const [caseName, conversationId] = process.argv.slice(2);
if (!caseName || !/^[a-z0-9-]{3,60}$/.test(caseName) ||
	!conversationId || !/^cm[a-z0-9]{10,}$/i.test(conversationId)) {
	throw new Error("Usage: capture-assistant-sales-request <case-name> <conversation-id>");
}

const session = await db.assistantSalesRequestSession.findUnique({
	where: { conversationId },
	select: {
		ownerUserId: true, scopeType: true, scopeId: true,
		saleType: true, sourceText: true,
	},
});
if (!session || !["order", "quote"].includes(session.saleType))
	throw new Error("Sales Request chat unavailable.");
if (/@|\b(?:Cell|Email|From|To):/i.test(session.sourceText))
	throw new Error("Use a sanitized body-only Assistant chat for local evaluation.");

const actor = {
	userId: session.ownerUserId,
	scopeType: session.scopeType,
	scopeId: session.scopeId,
	grants: {},
};
const dependencies = createAssistantSalesRequestPreviewDependencies(
	actor, { type: session.saleType as "order" | "quote" },
);
await dependencies.authorize();
await dependencies.reserveUsage();
const snapshot = await dependencies.readSnapshot();
const apiKey = getAssistantApiKey(snapshot.aiSelection.provider);
if (!apiKey) throw new Error("The selected Assistant provider is unavailable.");

const directory = join(process.cwd(), "../../.brain/evaluations/sales-request-generation/captures");
await mkdir(directory, { recursive: true });
const file = await open(join(directory, `${caseName}-local.json`), "wx", 0o600);
const captures: unknown[] = [];
let diagnostic: ReturnType<typeof classifySalesRequestProviderFailure> | null = null;
try {
	const provider = createSalesRequestProvider({
		selection: snapshot.aiSelection,
		apiKey,
		maxRetries: 0,
		maxOutputRepairs: 1,
		onEvaluationCapture: async (capture) => {
			captures.push(capture);
			await file.truncate(0);
			await file.write(JSON.stringify({
				caseName,
				configurationRevision: snapshot.revision,
				provider: snapshot.aiSelection.provider,
				model: snapshot.aiSelection.model,
				captures,
			}, null, 2), 0, "utf8");
			await file.sync();
		},
	});
	try {
		await generateNewSalesFormSeed({
			text: session.sourceText,
			images: [],
			signal: new AbortController().signal,
			configurationJson: snapshot.configurationJson,
			configurationRevision: snapshot.revision,
			adminRules: snapshot.adminRules,
		}, provider, { onProviderFailure: (failure) => { diagnostic = failure; } });
	} catch {
		// The response is already archived. Never print the model error or source.
	}
	console.log(JSON.stringify({
		caseName,
		captureCount: captures.length,
		failure: diagnostic && {
			stage: diagnostic.stage,
			structuredOutputCause: diagnostic.structuredOutputCause,
			configurationIssue: diagnostic.configurationIssue,
			schemaIssues: diagnostic.schemaIssues,
		},
	}));
} finally {
	await file.close();
	await db.$disconnect();
}
