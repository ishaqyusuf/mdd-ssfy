import {
	getSharedRedisClient,
	waitForRedisReady,
} from "@gnd/cache/shared-redis";
import {
	hasUpstashRestConfig,
	sendUpstashRestCommand,
} from "@gnd/cache/upstash-rest";

export async function sendAssistantRedisCommand<T>(
	command: (string | number)[],
) {
	if (hasUpstashRestConfig()) {
		const result = await sendUpstashRestCommand<T>(command);
		if (result === null) throw new Error("Shared Redis returned no result");
		return result;
	}
	if (!(await waitForRedisReady())) {
		throw new Error("Shared Redis is unavailable");
	}
	const result = await getSharedRedisClient().send(
		String(command[0]),
		command.slice(1),
	);
	if (result === null) throw new Error("Shared Redis returned no result");
	return result as T;
}
