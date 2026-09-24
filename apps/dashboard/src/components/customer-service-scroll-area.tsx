"use client";

import { createContext, useContext, useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

const ScrollAreaContext =
	createContext<RefObject<HTMLDivElement | null> | null>(null);

export function CustomerServiceScrollArea({
	children,
}: { children: ReactNode }) {
	const scrollRef = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const scrollArea = scrollRef.current;
		if (!scrollArea) return;
		let resizeObserver: ResizeObserver | undefined;
		const attachToolbar = () => {
			const toolbar = scrollArea.querySelector<HTMLElement>(
				"[data-customer-service-toolbar]",
			);
			if (!toolbar || resizeObserver) return;
			const measure = () => {
				scrollArea.style.setProperty(
					"--customer-service-toolbar-height",
					`${toolbar.getBoundingClientRect().height}px`,
				);
			};
			measure();
			resizeObserver = new ResizeObserver(measure);
			resizeObserver.observe(toolbar);
		};
		attachToolbar();
		const mutationObserver = new MutationObserver(attachToolbar);
		mutationObserver.observe(scrollArea, { childList: true, subtree: true });
		return () => {
			mutationObserver.disconnect();
			resizeObserver?.disconnect();
		};
	}, []);

	return (
		<ScrollAreaContext.Provider value={scrollRef}>
			<div
				ref={scrollRef}
				data-customer-service-scroll-area
				className="h-[calc(100dvh-70px)] min-w-0 overflow-auto overscroll-contain md:h-[calc(100dvh-94px)]"
			>
				{children}
			</div>
		</ScrollAreaContext.Provider>
	);
}

export function useCustomerServiceScrollArea() {
	const scrollRef = useContext(ScrollAreaContext);
	if (!scrollRef) {
		throw new Error("Customer Service scroll area is missing");
	}
	return scrollRef;
}
