import type { NewSalesFormType } from "../invoice-form/types";
import type { SalesDocumentOverviewSale } from "./sales-document-overview-model";

export type SalesDocumentOverviewActionStage = "dev" | "ready";

export type SalesDocumentOverviewActionId = "edit-document" | "copy";

type SalesDocumentOverviewRouteAction = {
	id: "edit-document";
	label: string;
	subtitle: string;
	icon: "Pencil";
	stage: SalesDocumentOverviewActionStage;
	route: {
		pathname: "/(sales)/invoices/[slug]";
		params: {
			slug: string;
			type: NewSalesFormType;
		};
	};
};

type SalesDocumentOverviewMutationAction = {
	id: "copy";
	label: string;
	subtitle: string;
	icon: "FileText";
	stage: SalesDocumentOverviewActionStage;
};

export type SalesDocumentOverviewAction =
	| SalesDocumentOverviewRouteAction
	| SalesDocumentOverviewMutationAction;

type SalesDocumentOverviewActionsInput = {
	type: NewSalesFormType;
	sale?: SalesDocumentOverviewSale | null;
	isDev?: boolean;
};

const EDIT_DOCUMENT_STAGE: SalesDocumentOverviewActionStage = "dev";
const COPY_STAGE: SalesDocumentOverviewActionStage = "dev";

export function getSalesDocumentOverviewMoreActions({
	type,
	sale,
	isDev = __DEV__,
}: SalesDocumentOverviewActionsInput): SalesDocumentOverviewAction[] {
	const slug = sale?.slug?.trim();
	if (!slug) return [];

	const actions: SalesDocumentOverviewAction[] = [
		{
			id: "edit-document",
			label: type === "quote" ? "Edit Quote" : "Edit Order",
			subtitle:
				type === "quote"
					? "Open this quote in the sales editor"
					: "Open this order in the sales editor",
			icon: "Pencil",
			stage: EDIT_DOCUMENT_STAGE,
			route: {
				pathname: "/(sales)/invoices/[slug]",
				params: { slug, type },
			},
		},
		{
			id: "copy",
			label: "Copy",
			subtitle: "Choose how to copy this document",
			icon: "FileText",
			stage: COPY_STAGE,
		},
	];

	return actions.filter((action) => {
		if (action.stage === "dev" && !isDev) return false;
		return true;
	});
}
