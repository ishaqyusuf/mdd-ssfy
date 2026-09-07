import { expect, test } from "bun:test";
import {
	getSalesPipelineFulfillmentStateLabel,
	getSalesPipelineProductionStateLabel,
} from "./sales-pipeline";

test("status-only milestones use Marked as completed without renaming stored states", () => {
	expect(getSalesPipelineFulfillmentStateLabel("administratively_completed")).toBe("Marked as completed");
	expect(getSalesPipelineProductionStateLabel("administratively_completed")).toBe("Marked as completed");
	expect(getSalesPipelineFulfillmentStateLabel("fulfilled")).toBe("Fulfilled");
	expect(getSalesPipelineProductionStateLabel("completed")).toBe("Production completed");
});
