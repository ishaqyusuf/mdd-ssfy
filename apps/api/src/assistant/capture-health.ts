import { sendAssistantRedisCommand } from "./redis-command";

const fields = ["attempts", "storageConfirmed", "storageUnconfirmed", "monitorSubmitted", "monitorUnavailable", "monitorFailed"] as const;
type Counts = Record<typeof fields[number], number>;
type Command = (command: (string | number)[]) => Promise<unknown>;
const captureHealthScript = `redis.call('HINCRBY',KEYS[1],'attempts',1)
redis.call('HINCRBY',KEYS[1],ARGV[1],1)
redis.call('HINCRBY',KEYS[1],ARGV[2],1)
redis.call('EXPIRE',KEYS[1],2678400)
return 1`;

function key(now: Date) {
	const environment = process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV === "test" ? "test" : "development";
	return `gnd:assistant:capture-health:${environment}:${now.toISOString().slice(0, 10)}`;
}

async function bounded<T>(operation: Promise<T>) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([operation, new Promise<never>((_, reject) => {
			timer = setTimeout(() => reject(new Error("Capture health unavailable")), 150);
		})]);
	} finally { clearTimeout(timer); }
}

/** Counts capture attempts, not incidents or confirmed remote delivery. No payloads are stored. */
export async function recordAssistantCaptureHealth(
	event: { stored: boolean; monitoring: "submitted" | "unavailable" | "failed" },
	command: Command = sendAssistantRedisCommand,
	now = new Date(),
) {
	const monitoring = { submitted: "monitorSubmitted", unavailable: "monitorUnavailable", failed: "monitorFailed" }[event.monitoring];
	await bounded(command(["EVAL", captureHealthScript, 1, key(now), event.stored ? "storageConfirmed" : "storageUnconfirmed", monitoring]));
}

export async function getAssistantCaptureHealth(command: Command = sendAssistantRedisCommand, now = new Date()) {
	const periodStart = `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
	try {
		// The shared TCP adapter supports bulk strings, not RESP array replies.
		const reply = await bounded(command(["EVAL", "return cjson.encode(redis.call('HGETALL',KEYS[1]))", 1, key(now)]));
		const raw = typeof reply === "string" ? JSON.parse(reply) : reply;
		const record = Array.isArray(raw) ? Object.fromEntries(Array.from({ length: raw.length / 2 }, (_, index) => [raw[index * 2], raw[index * 2 + 1]])) : raw;
		if (!record || typeof record !== "object" || (Array.isArray(raw) && raw.length % 2 !== 0)) throw new Error("Invalid counters");
		const counts = Object.fromEntries(fields.map(field => {
			const value = (record as Record<string, unknown>)[field];
			if (value !== undefined && typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value))) throw new Error("Invalid counter");
			const count = value === undefined ? 0 : Number(value);
			if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid counter");
			return [field, count];
		})) as Counts;
		if (counts.storageConfirmed + counts.storageUnconfirmed !== counts.attempts || counts.monitorSubmitted + counts.monitorUnavailable + counts.monitorFailed !== counts.attempts) throw new Error("Inconsistent counters");
		return { available: true as const, periodStart, counts };
	} catch {
		return { available: false as const, periodStart, counts: null };
	}
}
