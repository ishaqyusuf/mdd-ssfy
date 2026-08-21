"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { FlaskConical, Monitor, Smartphone, SplitSquareHorizontal } from "lucide-react";
import { useMemo } from "react";

import { useFulfillmentPrototypeParams } from "@/hooks/use-fulfillment-prototype-params";

import { PrototypeAdminPanel } from "./prototype-admin-panel";
import { PrototypeDriverPanel } from "./prototype-driver-panel";
import {
	getPrototypeScenarioState,
	prototypeScenarios,
	type PrototypeScenario,
} from "./prototype-state";

const scenarioLabels: Record<PrototypeScenario, string> = {
	assigned: "Assigned",
	packing: "Packing",
	blocked: "Needs help",
	denied: "Help denied",
	ready: "Ready to load",
	retry: "Weak network",
	backorder: "Back order",
	fulfilled: "Fulfilled",
	duplicate: "Duplicate submit",
	stale: "Stale assignment",
	reassigned: "Reassigned",
};

export function WorkflowPrototype() {
	const { params, setParams } = useFulfillmentPrototypeParams();
	const state = useMemo(
		() => getPrototypeScenarioState(params.scenario),
		[params.scenario],
	);

	return (
		<div className="space-y-4">
			<div className="rounded-xl border bg-muted/30 p-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="max-w-2xl">
						<div className="flex flex-wrap items-center gap-2">
							<Badge className="gap-1"><FlaskConical className="size-3" /> Simulated</Badge>
							<Badge variant="outline">No production writes</Badge>
						</div>
						<h1 className="mt-3 text-xl font-semibold">Connected fulfillment workflow prototype</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Choose a scenario to inspect the same order from the admin and driver surfaces. The URL preserves the selected review state.
						</p>
					</div>
					<div className="flex rounded-lg border bg-background p-1" aria-label="Prototype surface">
						<Button
							variant={params.surface === "split" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setParams({ surface: "split" })}
						>
							<SplitSquareHorizontal className="mr-2 size-4" /> Both
						</Button>
						<Button
							variant={params.surface === "admin" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setParams({ surface: "admin" })}
						>
							<Monitor className="mr-2 size-4" /> Admin
						</Button>
						<Button
							variant={params.surface === "driver" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setParams({ surface: "driver" })}
						>
							<Smartphone className="mr-2 size-4" /> Driver
						</Button>
					</div>
				</div>

				<div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Workflow scenarios">
					{prototypeScenarios.map((scenario) => (
						<Button
							key={scenario}
							variant={params.scenario === scenario ? "default" : "outline"}
							size="sm"
							className="shrink-0"
							onClick={() => setParams({ scenario })}
						>
							{scenarioLabels[scenario]}
						</Button>
					))}
				</div>
			</div>

			{params.scenario === "duplicate" ? (
				<div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
					<strong>Duplicate proof prevented.</strong> Request {state.lastRequestId} was accepted once; the repeated submission did not create another event or revision.
				</div>
			) : null}

			<div
				className={
					params.surface === "split"
						? "grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_410px]"
						: "grid items-start gap-5"
				}
			>
				{params.surface !== "driver" ? <PrototypeAdminPanel state={state} /> : null}
				{params.surface !== "admin" ? (
					<div className={params.surface === "driver" ? "py-4" : "xl:sticky xl:top-4"}>
						<PrototypeDriverPanel state={state} />
					</div>
				) : null}
			</div>
		</div>
	);
}
