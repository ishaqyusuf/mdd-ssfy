import type { NewSalesFormSeed } from "@gnd/sales/sales-form-core";
import {
	type SalesRequestConfiguration,
	serializeSalesRequestConfiguration,
} from "@gnd/sales/sales-form/request-generation";

export type RequestGenerationEvaluationFixture = {
	id: string;
	language: "en" | "es";
	text: string;
	configurationJson: string;
	configurationRevision: string;
	providerOutput: NewSalesFormSeed;
	expected: NewSalesFormSeed;
};

const requestConfiguration: SalesRequestConfiguration = {
	schemaVersion: 1,
	routes: [
		{
			itemTypeUid: "interior-door",
			rootStepId: 1,
			stepUids: ["frame", "door"],
			config: { noHandle: false, hasSwing: true },
		},
		{
			itemTypeUid: "exterior-door",
			rootStepId: 1,
			stepUids: ["frame", "door", "threshold"],
			config: { noHandle: false, hasSwing: true },
		},
	],
	steps: [
		{
			id: 1,
			uid: "item-type",
			title: "Item Type",
			selectionMode: "single",
			components: [
				{ uid: "interior-door", title: "Interior pre-hung" },
				{ uid: "exterior-door", title: "Exterior pre-hung" },
			],
		},
		{
			id: 20,
			uid: "frame",
			title: "Frame",
			selectionMode: "single",
			components: [
				{ uid: "frame-primed", title: "Primed frame" },
				{ uid: "frame-fiberglass", title: "Fiberglass frame" },
			],
		},
		{
			id: 51,
			uid: "door",
			title: "Door",
			selectionMode: "multiple",
			components: [
				{ uid: "door-six-panel", title: "Six-panel door" },
				{ uid: "door-three-lite", title: "Three-lite door" },
			],
		},
		{
			id: 66,
			uid: "threshold",
			title: "Threshold",
			selectionMode: "single",
			components: [{ uid: "threshold-standard", title: "Standard threshold" }],
		},
	],
	visibilityByComponentUid: {
		"interior-door": { variations: [] },
		"exterior-door": { variations: [] },
		"frame-primed": { variations: [] },
		"frame-fiberglass": { variations: [] },
		"door-six-panel": { variations: [] },
		"door-three-lite": {
			variations: [
				{
					rules: [
						{
							stepUid: "frame",
							operator: "is",
							componentsUid: ["frame-fiberglass"],
						},
					],
				},
			],
		},
		"threshold-standard": { variations: [] },
	},
};

const configurationJson =
	serializeSalesRequestConfiguration(requestConfiguration);

const interiorExpected: NewSalesFormSeed = {
	schemaVersion: 1,
	lineItems: [
		{
			uid: "interior-hallway",
			qty: 1,
			formSteps: [
				{ stepId: 1, prodUid: "interior-door" },
				{ stepId: 20, prodUid: "frame-primed" },
				{
					stepId: 51,
					meta: { selectedProdUids: ["door-six-panel"] },
				},
			],
			housePackageTool: {
				doors: [
					{
						dimension: "2-6 x 6-8",
						swing: "right",
						lhQty: 0,
						rhQty: 1,
					},
				],
			},
		},
	],
	unresolved: [],
};

const exteriorExpected: NewSalesFormSeed = {
	schemaVersion: 1,
	lineItems: [
		{
			uid: "exterior-entry",
			qty: 1,
			formSteps: [
				{ stepId: 1, prodUid: "exterior-door" },
				{ stepId: 20, prodUid: "frame-fiberglass" },
				{
					stepId: 51,
					meta: { selectedProdUids: ["door-three-lite"] },
				},
				{ stepId: 66, prodUid: "threshold-standard" },
			],
			housePackageTool: {
				doors: [
					{
						dimension: "3-0 x 6-8",
						swing: "left",
						lhQty: 1,
						rhQty: 0,
					},
				],
			},
		},
	],
	unresolved: [],
};

const ambiguousExpected: NewSalesFormSeed = {
	schemaVersion: 1,
	lineItems: [
		{
			uid: "exterior-patio-openings",
			qty: 2,
			formSteps: [
				{ stepId: 1, prodUid: "exterior-door" },
				{ stepId: 20, prodUid: "frame-fiberglass" },
				{
					stepId: 51,
					meta: { selectedProdUids: ["door-three-lite"] },
				},
				{ stepId: 66, prodUid: "threshold-standard" },
			],
		},
	],
	unresolved: [
		{
			lineUid: "exterior-patio-openings",
			stepId: null,
			field: "leafCount",
			status: "ambiguous",
			reason: "two openings but no single- or double-leaf count",
		},
	],
};

export const EVALUATION_FIXTURES: readonly RequestGenerationEvaluationFixture[] =
	[
		{
			id: "english-explicit-interior",
			language: "en",
			text: "Quote one interior pre-hung door for the hallway. Use a primed frame and six-panel door. The leaf is 30 by 80 inches, one leaf, right-hand, with a right swing.",
			configurationJson,
			configurationRevision: "evaluation-config-v1",
			providerOutput: interiorExpected,
			expected: interiorExpected,
		},
		{
			id: "spanish-explicit-exterior",
			language: "es",
			text: "Cotizar una puerta exterior precolgada para la entrada, con marco de fibra de vidrio, puerta de tres paneles y umbral estándar. La hoja mide 36 por 80 pulgadas, es una hoja, mano izquierda y giro izquierdo.",
			configurationJson,
			configurationRevision: "evaluation-config-v1",
			providerOutput: exteriorExpected,
			expected: exteriorExpected,
		},
		{
			id: "ambiguous-opening-count",
			language: "en",
			text: "Quote two exterior openings for the back patio using the standard fiberglass frame, three-lite door, and standard threshold. The request does not say whether each opening is single or double leaf, and gives no handing, swing, or dimensions.",
			configurationJson,
			configurationRevision: "evaluation-config-v1",
			providerOutput: ambiguousExpected,
			expected: ambiguousExpected,
		},
	];

export function findEvaluationFixture(id: string) {
	return EVALUATION_FIXTURES.find((fixture) => fixture.id === id) ?? null;
}
