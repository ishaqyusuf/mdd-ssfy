"use client";

import { updateSalesReportLayout } from "@/actions/update-sales-report-layout";
import { SalesDashboardHeader } from "@/components/sales-dashboard/header";
import {
	SalesChannelCard,
	SalesRecentOrdersCard,
	SalesRepPerformanceCard,
	SalesTopProductsCard,
} from "@/components/sales-dashboard/performance-grid";
import { SalesDashboardSummary } from "@/components/sales-dashboard/summary";
import { SalesBookedTrendCard } from "@/components/sales-dashboard/trend-card";
import { SalesReportCatalog } from "@/components/sales-reports/report-catalog";
import {
	DEFAULT_SALES_REPORT_LAYOUT,
	type SalesReportCardId,
	type SalesReportLayout,
	normalizeSalesReportLayout,
} from "@/lib/sales-report-layout";
import {
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Eye, GripVertical, LayoutDashboard, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const cardMeta: Record<
	SalesReportCardId,
	{ label: string; className: string; render: () => React.ReactNode }
> = {
	summary: {
		label: "Executive summary",
		className: "lg:col-span-12",
		render: () => <SalesDashboardSummary />,
	},
	"booked-sales-trend": {
		label: "Booked sales trend",
		className: "lg:col-span-8",
		render: () => <SalesBookedTrendCard className="h-full" />,
	},
	"recent-orders": {
		label: "Recent orders",
		className: "lg:col-span-4",
		render: () => <SalesRecentOrdersCard />,
	},
	"sales-reps": {
		label: "Sales rep performance",
		className: "lg:col-span-4",
		render: () => <SalesRepPerformanceCard />,
	},
	products: {
		label: "Product performance",
		className: "lg:col-span-4",
		render: () => <SalesTopProductsCard />,
	},
	channels: {
		label: "Sales channels",
		className: "lg:col-span-4",
		render: () => <SalesChannelCard />,
	},
};

export function SalesReportsWorkspace({
	initialLayout,
}: {
	initialLayout: SalesReportLayout;
}) {
	const [layout, setLayout] = useState(() =>
		normalizeSalesReportLayout(initialLayout),
	);
	const [customizing, setCustomizing] = useState(false);
	const initialRender = useRef(true);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);
	const visibleCards = layout.order.filter((id) => !layout.hidden.includes(id));

	useEffect(() => {
		if (initialRender.current) {
			initialRender.current = false;
			return;
		}
		const timeout = window.setTimeout(() => {
			updateSalesReportLayout(layout);
		}, 350);
		return () => window.clearTimeout(timeout);
	}, [layout]);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		setLayout((current) => {
			const oldIndex = current.order.indexOf(active.id as SalesReportCardId);
			const newIndex = current.order.indexOf(over.id as SalesReportCardId);
			return {
				...current,
				order: arrayMove(current.order, oldIndex, newIndex),
			};
		});
	}

	function setCardVisible(id: SalesReportCardId, visible: boolean) {
		setLayout((current) => ({
			...current,
			hidden: visible
				? current.hidden.filter((item) => item !== id)
				: [...new Set([...current.hidden, id])],
		}));
	}

	return (
		<div className="space-y-6">
			<SalesDashboardHeader
				title="Sales reports"
				description="A customizable performance workspace backed by the same governed sales metrics as the operational dashboard."
				showReportsLink={false}
			/>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold">Performance board</h2>
					<p className="text-sm text-muted-foreground">
						Reorder cards or hide views without changing the shared metric
						rules.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="gap-2">
								<Eye className="size-4" />
								Visible cards
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel>Report cards</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{layout.order.map((id) => (
								<DropdownMenuCheckboxItem
									key={id}
									checked={!layout.hidden.includes(id)}
									onCheckedChange={(checked) => setCardVisible(id, checked)}
								>
									{cardMeta[id].label}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					<Button
						variant={customizing ? "default" : "outline"}
						size="sm"
						className="gap-2"
						onClick={() => setCustomizing((value) => !value)}
					>
						<LayoutDashboard className="size-4" />
						{customizing ? "Done" : "Customize"}
					</Button>
					{customizing ? (
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Reset report layout"
							onClick={() => setLayout(DEFAULT_SALES_REPORT_LAYOUT)}
						>
							<RotateCcw className="size-4" />
						</Button>
					) : null}
				</div>
			</div>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={visibleCards}
					strategy={verticalListSortingStrategy}
				>
					<div className="grid gap-4 lg:grid-cols-12">
						{visibleCards.map((id) => (
							<SortableReportCard key={id} id={id} customizing={customizing} />
						))}
					</div>
				</SortableContext>
			</DndContext>
			<SalesReportCatalog />
		</div>
	);
}

function SortableReportCard({
	id,
	customizing,
}: {
	id: SalesReportCardId;
	customizing: boolean;
}) {
	const sortable = useSortable({ id, disabled: !customizing });
	const meta = cardMeta[id];
	const style = {
		transform: CSS.Transform.toString(sortable.transform),
		transition: sortable.transition,
	};

	return (
		<section
			ref={sortable.setNodeRef}
			style={style}
			className={cn(
				"relative min-w-0",
				meta.className,
				sortable.isDragging && "z-10 opacity-70",
				customizing && "rounded-xl ring-2 ring-primary/20",
			)}
			aria-label={meta.label}
		>
			{customizing ? (
				<button
					type="button"
					className="absolute right-2 top-2 z-20 flex size-8 cursor-grab items-center justify-center rounded-md border bg-background shadow-sm active:cursor-grabbing"
					aria-label={`Move ${meta.label}`}
					{...sortable.attributes}
					{...sortable.listeners}
				>
					<GripVertical className="size-4" />
				</button>
			) : null}
			{meta.render()}
		</section>
	);
}
