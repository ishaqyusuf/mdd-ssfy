"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import {
	type ReactNode,
	createContext,
	useContext,
	useRef,
	useState,
} from "react";

export type WorkflowStockCatalogComponent = {
	uid: string;
	title: string;
	imageSrc: string | null;
};
export type WorkflowStockSheetProps = {
	stepId: number;
	stepTitle: string;
	components: WorkflowStockCatalogComponent[];
	initialUid: string | null;
	onClose: () => void;
};

function useStockState(props: WorkflowStockSheetProps) {
	const trpc = useTRPC();
	const [selectedUid, setSelectedUid] = useState(props.initialUid);
	const [search, setSearch] = useState("");
	const [variantSearch, setVariantSearch] = useState("");
	const [expandedVariant, setExpandedVariant] = useState("");
	const [showMuted, setShowMuted] = useState(false);
	const [page, setPage] = useState(0);
	const rowsRef = useRef(new Map<string, HTMLButtonElement>());
	const filtered = props.components.filter((component) =>
		component.title.toLowerCase().includes(search.toLowerCase()),
	);
	const visible = filtered.slice(page * 100, (page + 1) * 100);
	const overview = useQuery(
		trpc.inventories.workflowStock.queryOptions(
			{
				stepId: props.stepId,
				componentUids: visible.map((component) => component.uid).sort(),
				includeVariants: false,
			},
			{ enabled: !selectedUid, staleTime: 15_000 },
		),
	);
	const detail = useQuery(
		trpc.inventories.workflowStock.queryOptions(
			{
				stepId: props.stepId,
				componentUids: selectedUid ? [selectedUid] : [],
				includeVariants: true,
			},
			{ enabled: Boolean(selectedUid), staleTime: 15_000 },
		),
	);
	return {
		...props,
		selectedUid,
		setSelectedUid: (uid: string | null) => {
			setSelectedUid(uid);
			setVariantSearch("");
			setExpandedVariant("");
			setShowMuted(false);
		},
		variantSearch,
		setVariantSearch,
		expandedVariant,
		setExpandedVariant,
		showMuted,
		setShowMuted,
		search,
		setSearch: (value: string) => {
			setSearch(value);
			setPage(0);
		},
		page,
		setPage,
		visible,
		total: filtered.length,
		overview,
		detail,
		rowsRef,
		selected: props.components.find(
			(component) => component.uid === selectedUid,
		),
		back: () => {
			const uid = selectedUid;
			setSelectedUid(null);
			requestAnimationFrame(() => {
				if (uid) rowsRef.current.get(uid)?.focus();
			});
		},
	};
}
type StockContext = ReturnType<typeof useStockState>;
const Context = createContext<StockContext | null>(null);
export function WorkflowStockProvider({
	children,
	...props
}: WorkflowStockSheetProps & { children: ReactNode }) {
	const value = useStockState(props);
	return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkflowStock() {
	const value = useContext(Context);
	if (!value) throw new Error("Workflow stock context is missing");
	return value;
}
