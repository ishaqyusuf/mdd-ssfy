import { describe, expect, it } from "bun:test";
import {
	proceedWorkflowMultiSelectStep,
	saveWorkflowSelectedComponent,
	selectAllWorkflowComponents,
	selectWorkflowRootComponent,
	setWorkflowComponentRedirect,
} from "./workflow-selection-actions";

const routeData = {
	composedRouter: {
		rootA: {
			routeSequence: [{ uid: "stepB" }, { uid: "stepC" }],
		},
	},
	stepsByUid: {
		rootStep: {
			id: 1,
			uid: "rootStep",
			title: "Item Type",
		},
		stepB: {
			id: 2,
			uid: "stepB",
			title: "Door",
		},
		stepC: {
			id: 3,
			uid: "stepC",
			title: "Line Item",
		},
	},
	stepsById: {
		1: "rootStep",
		2: "stepB",
		3: "stepC",
	},
	rootStepUid: "rootStep",
};

describe("workflow selection actions", () => {
	it("selects a root component and returns a line patch", () => {
		const result = selectWorkflowRootComponent({
			routeData,
			line: {
				uid: "line-1",
				title: "New Line",
				formSteps: [],
			},
			component: {
				id: 11,
				uid: "rootA",
				title: "Door",
			},
		});

		expect(result?.linePatch.formSteps).toHaveLength(3);
		expect(result?.linePatch.title).toBe("Door");
		expect(result?.activeStepIndex).toBe(1);
	});

	it("saves a single selected item-type component and advances to the route", () => {
		const result = saveWorkflowSelectedComponent({
			routeData,
			line: {
				uid: "line-1",
				title: "New Line",
				formSteps: [],
			},
			steps: [
				{
					stepId: 1,
					step: {
						id: 1,
						uid: "rootStep",
						title: "Item Type",
					},
					meta: {},
				},
			],
			currentStepIndex: 0,
			component: {
				id: 11,
				uid: "rootA",
				title: "Door",
				salesPrice: 100,
				basePrice: 80,
			},
			visibleComponents: [],
			activeStepTitle: "Item Type",
		});

		expect(result?.linePatch.formSteps).toHaveLength(3);
		expect(result?.linePatch.formSteps[0]?.prodUid).toBe("rootA");
		expect(result?.activeStepIndex).toBe(1);
	});

	it("proceeds a multi-select door step to the line item step", () => {
		const result = proceedWorkflowMultiSelectStep({
			routeData,
			line: {
				uid: "line-1",
				formSteps: [
					{
						stepId: 2,
						step: {
							id: 2,
							uid: "stepB",
							title: "Door",
						},
						prodUid: "doorA",
						value: "Door A",
						meta: {
							selectedProdUids: ["doorA"],
							selectedComponents: [
								{
									id: 21,
									uid: "doorA",
									title: "Door A",
									redirectUid: "stepC",
								},
							],
						},
					},
					{
						stepId: 3,
						step: {
							id: 3,
							uid: "stepC",
							title: "Line Item",
						},
						meta: {},
					},
				],
			},
			stepIndex: 0,
			visibleComponents: [
				{
					id: 21,
					uid: "doorA",
					title: "Door A",
					redirectUid: "stepC",
				},
			],
		});

		expect(result?.linePatch.formSteps[0]?.prodUid).toBe("doorA");
		expect(result?.activeStepIndex).toBe(1);
	});

	it("selects all visible components for a multi-select step", () => {
		const result = selectAllWorkflowComponents({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						meta: {},
					},
				],
			},
			stepIndex: 0,
			components: [
				{ id: 1, uid: "a", title: "A", salesPrice: 10, basePrice: 5 },
				{ id: 2, uid: "b", title: "B", salesPrice: 20, basePrice: 8 },
			],
		});

		expect(result?.formSteps[0]?.prodUid).toBe("a");
		expect(result?.formSteps[0]?.price).toBe(30);
		expect(result?.formSteps[0]?.basePrice).toBe(13);
		expect(result?.formSteps[0]?.meta?.selectedProdUids).toEqual(["a", "b"]);
	});

	it("updates selected component redirect and reroutes primary selections", () => {
		const result = setWorkflowComponentRedirect({
			routeData,
			line: {
				uid: "line-1",
				formSteps: [
					{
						stepId: 2,
						step: { id: 2, uid: "stepB", title: "Door" },
						prodUid: "doorA",
						value: "Door A",
						meta: {
							selectedComponents: [
								{
									uid: "doorA",
									title: "Door A",
								},
							],
						},
					},
				],
			},
			stepIndex: 0,
			componentUid: "doorA",
			redirectUid: "stepC",
		});

		expect(result?.linePatch.formSteps[0]?.meta?.redirectUid).toBe("stepC");
		expect(result?.activeStepIndex).toBeGreaterThanOrEqual(0);
	});
});
