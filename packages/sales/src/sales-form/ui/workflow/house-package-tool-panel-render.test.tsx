/** @jsxImportSource react */

import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HousePackageToolPanel } from "./house-package-tool-panel";

function renderPanel(options?: {
	doorSalesUnitPrice?: number;
	canEditPricing?: boolean;
	imageSrc?: string | null;
	hasSwing?: boolean;
	authoritativeLineTotal?: number;
	quantity?: number;
	sharedDoorSurcharge?: number;
}) {
	const doorSalesUnitPrice = options?.doorSalesUnitPrice ?? 5_500;
	const quantity = options?.quantity ?? 1;
	const sharedDoorSurcharge = options?.sharedDoorSurcharge ?? 500;
	const authoritativeLineTotal =
		options?.authoritativeLineTotal ??
		(doorSalesUnitPrice + sharedDoorSurcharge) * quantity;
	const row = {
		id: 1,
		dimension: "3-0 x 6-8",
		totalQty: quantity,
		unitPrice: doorSalesUnitPrice + sharedDoorSurcharge,
		lineTotal: authoritativeLineTotal,
		jambSizePrice: doorSalesUnitPrice,
		stepProductId: 10,
		swing: options?.hasSwing ? "outswing" : "",
		meta: {
			baseUnitPrice: 4_500,
			doorSalesUnitPrice,
			sharedDoorSurcharge,
		},
	};

	return renderToStaticMarkup(
		<HousePackageToolPanel
			selectedDoorComponents={[
				{
					id: 10,
					uid: "door-a",
					title: "Door A",
					img: options?.imageSrc,
				} as any,
			]}
			activeDoorUid="door-a"
			activeDoorComponent={
				{
					id: 10,
					uid: "door-a",
					title: "Door A",
					img: options?.imageSrc,
				} as any
			}
			focusedRows={[row as any]}
			summary={{
				rows: [row as any],
				totalDoors: quantity,
				totalPrice: row.lineTotal,
			}}
			availableSizeOptions={[
				{ size: "3-0 x 6-8", doorPrice: 4_500, selected: true },
			]}
			pricedSteps={[]}
			noHandle
			hasSwing={options?.hasSwing ?? false}
			swingOptions={
				options?.hasSwing
					? [
							{ value: "inswing", label: "In-Swing" },
							{ value: "outswing", label: "Out-Swing" },
						]
					: null
			}
			sharedDoorSurcharge={sharedDoorSurcharge}
			profileCoefficient={1}
			canSwapDoor={false}
			canEditPricing={options?.canEditPricing ?? true}
			formatMoney={(value) => `$${Number(value).toFixed(2)}`}
			componentLabel={(value) => value || ""}
			resolveImageSrc={(src) => (src ? `https://images.example/${src}` : null)}
			onActiveDoorChange={() => undefined}
			onAddSize={() => undefined}
			onConfigureSizes={() => undefined}
			onSwapDoor={() => undefined}
			onDeleteDoor={() => undefined}
			onPatchRow={() => undefined}
			onRemoveSizeRow={() => undefined}
		/>,
	);
}

describe("HousePackageToolPanel repair action", () => {
	it("keeps the displayed estimate aligned with the authoritative persisted line total", () => {
		const html = renderPanel({
			doorSalesUnitPrice: 425.54,
			sharedDoorSurcharge: 34.85,
			authoritativeLineTotal: 4_952.4,
			quantity: 10,
		});

		expect(html).not.toContain("$460.39");
		expect(html).toContain("$495.24");
		expect(html).toContain("$4952.40");
	});

	it("keeps the actions heading accessible-only and reserves the freed width for Swing", () => {
		const html = renderPanel({ hasSwing: true });

		expect(html).toContain('<th class="w-28 px-2 py-2">Swing</th>');
		expect(html).toContain('<span class="sr-only">Actions</span>');
		expect(html).toContain(
			"h-8 w-full min-w-0 rounded-md border-slate-200 text-xs",
		);
		expect(html).not.toContain(">Actions</th>");
	});

	it("makes the active door avatar an accessible image preview trigger", () => {
		const html = renderPanel({ imageSrc: "door-a.png" });

		expect(html).toContain('aria-label="View Door A image"');
		expect(html).toContain('src="https://images.example/door-a.png"');
		expect(html).toContain('data-component-image-preview-trigger="true"');
	});

	it("renders Repair in the right actions when profile pricing drift exists", () => {
		const html = renderPanel();

		expect(html).toContain("Actions");
		expect(html).toContain('aria-label="Repair price for 3-0 x 6-8"');
	});

	it("hides Repair when pricing is aligned or the user cannot edit pricing", () => {
		expect(renderPanel({ doorSalesUnitPrice: 4_500 })).not.toContain(
			"Repair price for",
		);
		expect(renderPanel({ canEditPricing: false })).not.toContain(
			"Repair price for",
		);
	});
});
