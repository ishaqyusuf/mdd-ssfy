import { useQueryStates } from "nuqs";
import { parseAsStringLiteral } from "nuqs/server";

import { prototypeScenarios } from "@/components/dispatch-admin/workflow-prototype/prototype-state";

const prototypeSurfaces = ["split", "admin", "driver"] as const;

export const fulfillmentPrototypeParamsSchema = {
	surface: parseAsStringLiteral(prototypeSurfaces).withDefault("split"),
	scenario: parseAsStringLiteral(prototypeScenarios).withDefault("assigned"),
};

export function useFulfillmentPrototypeParams() {
	const [params, setParams] = useQueryStates(fulfillmentPrototypeParamsSchema, {
		shallow: true,
	});
	return { params, setParams };
}
