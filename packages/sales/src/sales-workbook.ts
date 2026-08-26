export type SalesWorkbookColumn = {
	key: string;
	label: string;
	type: "text" | "integer" | "number" | "money" | "date-time";
	width: number;
};

export type SalesWorkbookCell = string | number | null;
export type SalesWorkbookRow = Record<string, SalesWorkbookCell>;

export type SalesWorkbookSheet = {
	name: string;
	columns: SalesWorkbookColumn[];
	rows: SalesWorkbookRow[];
};

export type SalesWorkbookReport<TType extends string = string> = {
	type: TType;
	title: string;
	description: string;
	fileSlug: string;
	generatedAt: Date;
	rowCount: number;
	sheets: SalesWorkbookSheet[];
};
