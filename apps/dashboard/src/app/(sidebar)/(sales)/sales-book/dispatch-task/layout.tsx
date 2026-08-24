import type { ReactNode } from "react";

export default function DispatchTaskLayout({
	children,
	modal,
}: {
	children: ReactNode;
	modal: ReactNode;
}) {
	return (
		<>
			{children}
			{modal}
		</>
	);
}
