import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SalesMenu } from "@/components/sales-menu";

export function SalesFormEmailMenu({}) {
	const zus = useFormDataStore();
	const customer = zus?.metaData?.customer as
		| {
				email?: string | null;
				businessName?: string | null;
				name?: string | null;
		  }
		| undefined;

	return (
		<SalesMenu
			id={zus?.metaData?.id}
			type={zus.metaData.type}
			orderNo={zus?.metaData?.salesId}
			customerEmail={customer?.email ?? null}
			customerName={customer?.businessName || customer?.name}
		>
			{zus.metaData.type === "quote" ? (
				<SalesMenu.QuoteEmailMenuItems />
			) : (
				<SalesMenu.SalesEmailMenuItems />
			)}
		</SalesMenu>
	);
}
