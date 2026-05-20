"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
	children: React.ReactNode;
	nodeId: string;
	noDelay?: boolean;
};

export default function Portal({ children, nodeId, noDelay }: Props) {
	const [node, setNode] = useState<HTMLElement | null>(null);

	useEffect(() => {
		let cancelled = false;
		let observer: MutationObserver | null = null;

		const resolveNode = () => {
			if (cancelled) return;

			const existingNode = document.getElementById(nodeId);
			if (existingNode) {
				setNode(existingNode);
				return;
			}

			observer = new MutationObserver(() => {
				const nextNode = document.getElementById(nodeId);
				if (!nextNode) return;
				setNode(nextNode);
				observer?.disconnect();
				observer = null;
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true,
			});
		};

		setNode(document.getElementById(nodeId));
		const timeout = window.setTimeout(resolveNode, noDelay ? 0 : 150);

		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
			observer?.disconnect();
		};
	}, [nodeId, noDelay]);

	if (!node) return null;
	return createPortal(<>{children}</>, node);
}
