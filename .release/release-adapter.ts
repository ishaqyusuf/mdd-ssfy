import { createGndProviderBindings } from "./gnd-provider-bundle";
import {
	type ConsumerReleaseContext,
	runConsumerReleaseCheck,
} from "./toolkit/9a324b2c4e759d4713375e7853ef7d791c357552/src/release/consumer";

export async function checkRelease(context: ConsumerReleaseContext) {
	return runConsumerReleaseCheck(context, createGndProviderBindings(context));
}
