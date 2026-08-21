/** @jsxImportSource react */
"use client";

import { cn } from "@gnd/ui/cn";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

const COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_KEY =
	"gnd:sales-form:component-image-preview-highlight:v2";
export const COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_WINDOW_MS =
	7 * 24 * 60 * 60 * 1_000;

const COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_STYLE: CSSProperties = {
	backgroundImage:
		"linear-gradient(135deg, #3b82f6 0%, #8b5cf6 55%, #f59e0b 100%)",
	backgroundOrigin: "border-box",
	borderColor: "transparent",
	borderWidth: 1,
	boxShadow: "none",
	padding: 0,
};

export function isComponentImagePreviewHighlightActive(
	firstSeenAt: number,
	now: number,
) {
	return (
		Number.isFinite(firstSeenAt) &&
		firstSeenAt <= now &&
		now - firstSeenAt < COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_WINDOW_MS
	);
}

function useComponentImagePreviewHighlight() {
	const [active, setActive] = useState(false);

	useEffect(() => {
		const now = Date.now();
		let firstSeenAt = now;

		try {
			const storedFirstSeenAt = Number(
				window.localStorage.getItem(COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_KEY),
			);
			if (
				Number.isFinite(storedFirstSeenAt) &&
				storedFirstSeenAt > 0 &&
				storedFirstSeenAt <= now
			) {
				firstSeenAt = storedFirstSeenAt;
			} else {
				window.localStorage.setItem(
					COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_KEY,
					String(now),
				);
			}
		} catch {
			// Keep the discovery affordance for this session when storage is blocked.
		}

		const remainingMs =
			COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_WINDOW_MS - (now - firstSeenAt);
		if (remainingMs <= 0) return;

		setActive(true);
		const timeoutId = window.setTimeout(() => setActive(false), remainingMs);
		return () => window.clearTimeout(timeoutId);
	}, []);

	return active;
}

export type ComponentImageLightboxProps = {
	imageSrc?: string | null;
	title: string;
	alt?: string | null;
	className?: string;
	imageClassName?: string;
	fallback: ReactNode;
};

export function ComponentImageLightbox(props: ComponentImageLightboxProps) {
	const [open, setOpen] = useState(false);
	const highlightActive = useComponentImagePreviewHighlight();
	const alt = props.alt || props.title;

	if (!props.imageSrc) {
		return (
			<div
				className={cn(
					"flex shrink-0 items-center justify-center overflow-hidden border bg-card",
					props.className,
				)}
			>
				{props.fallback}
			</div>
		);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<button
				type="button"
				aria-label={`View ${props.title} image`}
				data-component-image-preview-trigger="true"
				data-discovery-highlight={highlightActive ? "active" : "inactive"}
				className={cn(
					"group relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden border bg-card p-px outline-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none",
					props.className,
				)}
				onClick={() => setOpen(true)}
				style={
					highlightActive ? COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_STYLE : undefined
				}
			>
				<span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit] bg-card">
					<img
						src={props.imageSrc}
						alt={alt}
						className={cn(
							"h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transform-none",
							props.imageClassName,
						)}
					/>
				</span>
			</button>

			<DialogContent
				hideClose
				className="w-auto max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 shadow-none sm:max-w-[calc(100vw-4rem)]"
			>
				<DialogTitle className="sr-only">
					{props.title} image preview
				</DialogTitle>
				<DialogDescription className="sr-only">
					Large preview of {props.title}. Press Escape or use Close preview to
					return to the sales form.
				</DialogDescription>
				<img
					src={props.imageSrc}
					alt={alt}
					className="max-h-[86dvh] max-w-[min(92vw,72rem)] rounded-md object-contain drop-shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
				/>
				<DialogClose asChild>
					<button
						type="button"
						aria-label={`Close ${props.title} image preview`}
						className="fixed right-4 top-4 flex size-10 items-center justify-center rounded-full border border-white/25 bg-slate-950 text-white shadow-lg transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:right-6 sm:top-6"
					>
						<Icons.X className="size-5" />
					</button>
				</DialogClose>
			</DialogContent>
		</Dialog>
	);
}
