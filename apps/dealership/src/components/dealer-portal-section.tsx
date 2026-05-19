"use client";

import { DealerCustomers } from "./dealer-portal/dealer-customers";
import { DealerSalesDocuments } from "./dealer-portal/dealer-sales-documents";
import { DealerSalesProfiles } from "./dealer-portal/dealer-sales-profiles";
import { DealerSettings } from "./dealer-portal/dealer-settings";

type Section = "orders" | "quotes" | "customers" | "profiles" | "settings";

type DealerPortalSectionProps = {
	section: Section;
};

export function DealerPortalSection({ section }: DealerPortalSectionProps) {
	if (section === "customers") return <DealerCustomers />;
	if (section === "profiles") return <DealerSalesProfiles />;
	if (section === "settings") return <DealerSettings />;
	return (
		<DealerSalesDocuments type={section === "quotes" ? "quote" : "order"} />
	);
}
