import { SalesNav } from "@/components/sales-nav";
import type { ReactNode } from "react";

export default function SalesEnvironmentLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<>
			{children}
			<SalesNav />
		</>
	);
}
