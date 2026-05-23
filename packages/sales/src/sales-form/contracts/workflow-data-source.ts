import type { ReactNode } from "react";
import type {
	CustomerProfileRecord,
	DoorStoredRow,
	MouldingRow,
	ServiceRow,
	ShelfCategoryRecord,
	ShelfSectionDraft,
	ShelfProductRecord,
	WorkflowComponentRecord,
	WorkflowLineItemRecord,
	WorkflowStepRecord,
} from "../ui/workflow";

export type SalesFormWorkflowQueryResult<TData> = {
	data?: TData | null;
	isPending?: boolean;
	refetch?: () => Promise<unknown> | unknown;
};

export type SalesFormWorkflowStepComponentInput = {
	stepId?: number | null;
	stepTitle?: string | null;
	enabled?: boolean;
};

export type SalesFormWorkflowDataSource = {
	useStepRouting: () => SalesFormWorkflowQueryResult<Record<string, any>>;
	useStepComponents: (
		input: SalesFormWorkflowStepComponentInput,
	) => SalesFormWorkflowQueryResult<WorkflowComponentRecord[]>;
	useRootComponents?: (
		input: SalesFormWorkflowStepComponentInput,
	) => SalesFormWorkflowQueryResult<WorkflowComponentRecord[]>;
	useDoorComponents?: (
		input: SalesFormWorkflowStepComponentInput,
	) => SalesFormWorkflowQueryResult<WorkflowComponentRecord[]>;
	useCustomerProfiles?: () => SalesFormWorkflowQueryResult<
		CustomerProfileRecord[]
	>;
	useShelfCategories?: () => SalesFormWorkflowQueryResult<
		ShelfCategoryRecord[]
	>;
	useShelfProducts?: (input: {
		categoryIds: number[];
		enabled?: boolean;
	}) => SalesFormWorkflowQueryResult<ShelfProductRecord[]>;
	useDoorSuppliers?: (input?: {
		enabled?: boolean;
	}) => SalesFormWorkflowQueryResult<{
		stepProducts?: Array<{
			uid?: string | null;
			name?: string | null;
		}>;
	} | null>;
	resolveImageSrc?: (src?: string | null) => string | null;
	renderMouldingCalculator?: (input: {
		title: string;
		unitPrice: number;
		qty: number;
		onCalculate: (qty: number) => void;
	}) => ReactNode;
};

export type SalesFormWorkflowActions<TLine extends WorkflowLineItemRecord> = {
	addLineItem?: () => void;
	updateLineItem: (uid: string, patch: Partial<TLine>) => void;
	removeLineItem: (uid: string) => void;
	setActiveItem?: (uid: string | null) => void;
	setActiveStep?: (uid: string, stepIndex: number) => void;
};

export type SalesFormWorkflowSurfaceSlots<
	TLine extends WorkflowLineItemRecord = WorkflowLineItemRecord,
> = {
	renderFlatLineEditor?: (input: {
		line: TLine;
		updateLine: (patch: Partial<TLine>) => void;
	}) => ReactNode;
	renderHousePackageToolPanel?: (input: {
		line: TLine;
		step: WorkflowStepRecord;
	}) => ReactNode;
	renderShelfPanel?: (input: {
		line: TLine;
		sections: ShelfSectionDraft[];
		updateSections: (sections: ShelfSectionDraft[]) => void;
	}) => ReactNode;
	renderMouldingPanel?: (input: {
		line: TLine;
		rows: MouldingRow[];
		updateRows: (rows: MouldingRow[]) => void;
	}) => ReactNode;
	renderServicePanel?: (input: {
		line: TLine;
		rows: ServiceRow[];
		updateRows: (rows: ServiceRow[]) => void;
	}) => ReactNode;
	renderDoorSizeEditor?: (input: {
		line: TLine;
		component: WorkflowComponentRecord;
		rows: DoorStoredRow[];
	}) => ReactNode;
	getComponentRedirectOptions?: (input: {
		routeData: Record<string, any> | null;
		line: TLine;
		step: WorkflowStepRecord;
		stepIndex: number;
	}) => Array<{ uid: string; title: string }>;
	componentActions?: {
		onOpenPricing?: (
			input: SalesFormWorkflowComponentActionInput<TLine>,
		) => void;
		onOpenDoorSizeVariant?: (
			input: SalesFormWorkflowComponentActionInput<TLine>,
		) => void;
		onEnableCustomComponent?: (
			input: Omit<SalesFormWorkflowComponentActionInput<TLine>, "component">,
		) => void;
		onEdit?: (input: SalesFormWorkflowComponentActionInput<TLine>) => void;
		onEditSectionOverride?: (
			input: SalesFormWorkflowComponentActionInput<TLine>,
		) => void;
		onClearRedirect?: (
			input: SalesFormWorkflowComponentActionInput<TLine>,
		) => void;
		onSetRedirect?: (
			input: SalesFormWorkflowComponentActionInput<TLine> & {
				redirectUid: string;
			},
		) => void;
		onDelete?: (input: SalesFormWorkflowComponentActionInput<TLine>) => void;
	};
};

export type SalesFormWorkflowComponentActionInput<
	TLine extends WorkflowLineItemRecord = WorkflowLineItemRecord,
> = {
	routeData: Record<string, any> | null;
	line: TLine;
	steps: WorkflowStepRecord[];
	step: WorkflowStepRecord;
	stepIndex: number;
	component: WorkflowComponentRecord;
};

export type SalesFormWorkflowEditorState = {
	activeItem?: string | null;
	activeStepByLine?: Record<string, number>;
};

export type SalesFormWorkflowRecord<TLine extends WorkflowLineItemRecord> = {
	form?: {
		customerProfileId?: number | null;
		[key: string]: unknown;
	} | null;
	lineItems: TLine[];
};

export type SalesFormWorkflowPricingSurface<
	TLine extends WorkflowLineItemRecord,
> = {
	lineTotalMode?: "editable" | "readonly";
	getLineDisplayTotal?: (line: TLine) => number;
};
