/** @jsxImportSource react */
"use client";

import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useMediaQuery } from "react-responsive";
import { cn } from "../../utils";
import { Button } from "../button";
import { Icons } from "../icons";
import { ScrollArea } from "../scroll-area";
import { Separator } from "../separator";
import {
	Sheet as BaseSheet,
	SheetClose,
	SheetContent,
	type SheetContentProps,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "../sheet";
import Portal from "./portal";
import {
	CUSTOM_SHEET_CLOSE_MS,
	CUSTOM_SHEET_OPEN_MS,
	type CustomSheetV2Size,
	resolveCustomSheetDismissLayer,
	resolveCustomSheetLayout,
} from "./sheet-v2-layout";

interface Props extends Omit<SheetContentProps, "children"> {
	children?: ReactNode;
	onCloseSecondary?: () => void;
	onOpenChange?: (open: boolean) => void;
	onSecondaryExited?: () => void;
	open?: boolean;
	primarySize?: CustomSheetV2Size;
	secondaryOpened?: boolean;
	secondarySize?: CustomSheetV2Size;
	sheetName: string;
	tabletFullscreen?: boolean;
}

type CustomSheetContextValue = {
	activeSurfaceWidthRem: number;
	isSideBySide: boolean;
	multiContentId: string;
	nodeId: string;
	onCloseSecondary?: () => void;
	primaryPortalId: string;
	primaryWidthRem: number;
	scrollContentId: string;
	secondaryContentId: string;
	secondaryOpened: boolean;
	secondaryWidthRem: number;
};

export const CustomSheetV2Context = createContext<
	CustomSheetContextValue | undefined
>(undefined);
export const SheetV2Provider = CustomSheetV2Context.Provider;

function useCustomSheetContextValue(props: Props): CustomSheetContextValue {
	const primarySize = props.primarySize ?? "default";
	const secondarySize = props.secondarySize ?? primarySize;
	const requiredLayout = useMemo(
		() =>
			resolveCustomSheetLayout({
				isSideBySide: true,
				primarySize,
				secondaryOpened: true,
				secondarySize,
			}),
		[primarySize, secondarySize],
	);
	const isSideBySide = useMediaQuery({
		query: `(min-width: ${requiredLayout.sideBySideMinViewportRem}rem)`,
	});
	const layout = resolveCustomSheetLayout({
		isSideBySide,
		primarySize,
		secondaryOpened: Boolean(props.secondaryOpened),
		secondarySize,
	});
	const idBase = ["custom-sheet", props.sheetName].filter(Boolean).join("-");

	return {
		activeSurfaceWidthRem: layout.activeSurfaceWidthRem,
		isSideBySide,
		multiContentId: `${idBase}-multi-content`,
		nodeId: idBase,
		onCloseSecondary: props.onCloseSecondary,
		primaryPortalId: `${idBase}-primary-portal`,
		primaryWidthRem: layout.primaryWidthRem,
		scrollContentId: `${idBase}-scroll-content`,
		secondaryContentId: `${idBase}-secondary-content`,
		secondaryOpened: Boolean(props.secondaryOpened),
		secondaryWidthRem: layout.secondaryWidthRem,
	};
}

export function useSheetV2() {
	const context = useContext(CustomSheetV2Context);
	if (context === undefined) {
		throw new Error("useSheetV2 must be used within a CustomSheetV2Provider");
	}
	return context;
}

export function CustomSheetV2(props: Props) {
	const context = useCustomSheetContextValue(props);

	return (
		<SheetV2Provider value={context}>
			<CustomSheetBase {...props} />
		</SheetV2Provider>
	);
}

type CustomSheetCSSProperties = CSSProperties & {
	"--sheet-active-surface-width": string;
	"--sheet-primary-pane-width": string;
	"--sheet-secondary-pane-width": string;
};

function CustomSheetBase({
	children,
	className,
	hideClose,
	onCloseSecondary: _onCloseSecondary,
	onOpenChange,
	onEscapeKeyDown,
	onPointerDownOutside,
	onSecondaryExited,
	open,
	primarySize: _primarySize,
	secondaryOpened: _secondaryOpened,
	secondarySize: _secondarySize,
	sheetName: _sheetName,
	tabletFullscreen,
	style,
	...props
}: Props) {
	const sheet = useSheetV2();
	const secondaryExitedRef = useRef(onSecondaryExited);
	const wasSecondaryOpenedRef = useRef(sheet.secondaryOpened);

	useEffect(() => {
		secondaryExitedRef.current = onSecondaryExited;
	}, [onSecondaryExited]);

	useEffect(() => {
		const wasSecondaryOpened = wasSecondaryOpenedRef.current;
		wasSecondaryOpenedRef.current = sheet.secondaryOpened;

		if (!(wasSecondaryOpened && !sheet.secondaryOpened)) return;

		const timeoutId = window.setTimeout(() => {
			secondaryExitedRef.current?.();
		}, CUSTOM_SHEET_CLOSE_MS);

		return () => window.clearTimeout(timeoutId);
	}, [sheet.secondaryOpened]);

	const handleOpenChange = (nextOpen: boolean) => {
		const dismissLayer = resolveCustomSheetDismissLayer({
			canCloseSecondary: Boolean(sheet.onCloseSecondary),
			secondaryOpened: sheet.secondaryOpened,
		});

		if (!nextOpen && dismissLayer === "secondary") {
			sheet.onCloseSecondary?.();
			return;
		}

		onOpenChange?.(nextOpen);
	};
	const sheetStyle = {
		...style,
		"--sheet-active-surface-width": `${sheet.activeSurfaceWidthRem}rem`,
		"--sheet-primary-pane-width": `${sheet.primaryWidthRem}rem`,
		"--sheet-secondary-pane-width": `${sheet.secondaryWidthRem}rem`,
		transitionDuration: `${sheet.secondaryOpened ? CUSTOM_SHEET_OPEN_MS : CUSTOM_SHEET_CLOSE_MS}ms`,
		width:
			"min(100dvw, calc(var(--sheet-active-surface-width) + var(--sheet-frame-width)))",
	} as CustomSheetCSSProperties;

	return (
		<BaseSheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent
				id={sheet.nodeId}
				{...props}
				hideClose
				onEscapeKeyDown={(event) => {
					onEscapeKeyDown?.(event);
					if (
						!event.defaultPrevented &&
						sheet.secondaryOpened &&
						sheet.onCloseSecondary
					) {
						event.preventDefault();
						sheet.onCloseSecondary();
					}
				}}
				onPointerDownOutside={(event) => {
					onPointerDownOutside?.(event);
					if (event.defaultPrevented) return;

					if (sheet.secondaryOpened && sheet.onCloseSecondary) {
						event.preventDefault();
						sheet.onCloseSecondary();
						return;
					}

					if (onOpenChange) {
						event.preventDefault();
						window.addEventListener(
							"pointerup",
							() => {
								window.setTimeout(() => onOpenChange(false), 0);
							},
							{ once: true },
						);
					}
				}}
				style={sheetStyle}
				className={cn(
					"flex h-dvh max-w-none flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-none",
					"[--sheet-frame-width:0rem] md:[--sheet-frame-width:2rem] md:p-4",
					tabletFullscreen &&
						"md:max-lg:!w-dvw md:max-lg:[--sheet-frame-width:0rem] md:max-lg:p-0",
					"transition-[width] ease-out motion-reduce:transition-none",
					"data-[state=open]:duration-300 data-[state=closed]:duration-200",
				)}
			>
				<div
					data-slot="custom-sheet-surface"
					className={cn(
						"relative flex h-full w-full min-w-0 flex-col overflow-hidden border bg-background p-4 shadow-lg md:rounded-[10px] md:p-6",
						tabletFullscreen &&
							"md:max-lg:rounded-none md:max-lg:border-0 md:max-lg:p-4",
						className,
					)}
				>
					{children}
					{!hideClose && !sheet.secondaryOpened ? (
						<SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none md:right-6 md:top-6">
							<Icons.X className="size-4" />
							<span className="sr-only">Close</span>
						</SheetClose>
					) : null}
				</div>
			</SheetContent>
		</BaseSheet>
	);
}

function CustomSheetContentPortal({
	children,
	hideWhenSecondary = false,
}: {
	children?: ReactNode;
	hideWhenSecondary?: boolean;
}) {
	const sheet = useSheetV2();

	if (hideWhenSecondary && sheet.secondaryOpened) return null;

	return (
		<Portal nodeId={sheet.primaryPortalId} noDelay>
			{children}
		</Portal>
	);
}

export function CustomSheetContent({
	children = null,
	Header = null,
	className = "",
	contentClassName,
	secondary = false,
}: {
	children?: ReactNode;
	Header?: ReactNode;
	className?: string;
	contentClassName?: string;
	secondary?: boolean;
}) {
	const sheet = useSheetV2();

	return (
		<>
			{Header}
			<ScrollArea
				className={cn(
					"-mx-4 flex min-h-0 flex-1 flex-col px-4 md:-mx-6 md:px-6",
					className,
				)}
			>
				<div
					id={
						secondary
							? `${sheet.scrollContentId}-secondary`
							: sheet.scrollContentId
					}
					className={cn("flex flex-col gap-4 pb-36 sm:pb-16", contentClassName)}
				>
					{children}
				</div>
			</ScrollArea>
		</>
	);
}

export function MultiSheetContent({
	children = null,
	className = "",
}: {
	children?: ReactNode;
	className?: string;
}) {
	const sheet = useSheetV2();
	const durationMs = sheet.secondaryOpened
		? CUSTOM_SHEET_OPEN_MS
		: CUSTOM_SHEET_CLOSE_MS;
	const primaryBasis = sheet.isSideBySide
		? "var(--sheet-primary-pane-width)"
		: sheet.secondaryOpened
			? "0rem"
			: "100%";
	const secondaryBasis = sheet.isSideBySide
		? sheet.secondaryOpened
			? "var(--sheet-secondary-pane-width)"
			: "0rem"
		: sheet.secondaryOpened
			? "100%"
			: "0rem";
	const dividerBasis =
		sheet.isSideBySide && sheet.secondaryOpened ? "1px" : "0px";
	const transitionStyle = {
		transitionDuration: `${durationMs}ms`,
	};

	return (
		<div
			id={sheet.multiContentId}
			data-slot="multi-sheet-content"
			className={cn(
				"-m-4 flex min-h-0 flex-1 overflow-hidden md:-m-6",
				className,
			)}
		>
			<div
				data-sheet-pane="primary"
				aria-hidden={!sheet.isSideBySide && sheet.secondaryOpened}
				inert={!sheet.isSideBySide && sheet.secondaryOpened ? true : undefined}
				className={cn(
					"flex min-w-0 flex-none flex-col overflow-hidden",
					"transition-[width,flex-basis,opacity,transform] ease-out motion-reduce:transition-none",
					!sheet.isSideBySide && sheet.secondaryOpened
						? "pointer-events-none -translate-x-4 opacity-0"
						: "translate-x-0 opacity-100",
				)}
				style={{
					...transitionStyle,
					flexBasis: primaryBasis,
					width: primaryBasis,
				}}
			>
				<div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
						{children}
					</div>
					<div
						id={sheet.primaryPortalId}
						data-slot="custom-sheet-primary-footer"
						className="shrink-0 bg-background"
					/>
				</div>
			</div>
			<div
				data-sheet-divider
				aria-hidden="true"
				className={cn(
					"flex-none overflow-hidden opacity-0 transition-[width,flex-basis,opacity] ease-out motion-reduce:transition-none",
					sheet.isSideBySide && sheet.secondaryOpened && "opacity-100",
				)}
				style={{
					...transitionStyle,
					flexBasis: dividerBasis,
					width: dividerBasis,
				}}
			>
				<Separator orientation="vertical" className="h-full w-px" />
			</div>
			<div
				data-sheet-pane="secondary"
				aria-hidden={!sheet.secondaryOpened}
				inert={sheet.secondaryOpened ? undefined : true}
				className={cn(
					"flex min-w-0 flex-none flex-col overflow-hidden bg-background",
					"transition-[width,flex-basis,opacity,transform] ease-out motion-reduce:transition-none",
					sheet.secondaryOpened
						? "pointer-events-auto translate-x-0 opacity-100"
						: "pointer-events-none translate-x-4 opacity-0",
				)}
				style={{
					...transitionStyle,
					flexBasis: secondaryBasis,
					width: secondaryBasis,
				}}
			>
				<div
					id={sheet.secondaryContentId}
					className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4 md:p-6"
				/>
			</div>
		</div>
	);
}

function PrimaryContent({ children }: { children?: ReactNode }) {
	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
			{children}
		</div>
	);
}

function CloseSecondary() {
	const sheet = useSheetV2();

	return (
		<Button
			aria-label="Back to sales overview"
			title="Back to sales overview"
			type="button"
			onClick={() => sheet.onCloseSecondary?.()}
			className="size-7 shrink-0 p-0"
			variant="outline"
		>
			<Icons.chevronLeft className="size-4" />
		</Button>
	);
}

interface SecondaryHeaderProps {
	actions?: ReactNode;
	children?: ReactNode;
	description?: ReactNode;
	title?: ReactNode;
}

function SecondaryHeader(props: SecondaryHeaderProps) {
	return (
		<SheetHeader className="flex-row items-start gap-3 space-y-0 bg-background text-left">
			<CloseSecondary />
			<div className="grid min-w-0 flex-1 gap-1.5">
				{props.children ?? (
					<>
						<SheetTitle>{props.title}</SheetTitle>
						<SheetDescription>{props.description}</SheetDescription>
					</>
				)}
			</div>
			{props.actions ? <div className="shrink-0">{props.actions}</div> : null}
		</SheetHeader>
	);
}

function SecondaryFooter({
	children,
	className = "",
}: {
	children?: ReactNode;
	className?: string;
}) {
	return (
		<SheetFooter className={cn("border-t pt-4 md:pt-6", className)}>
			{children}
		</SheetFooter>
	);
}

export function SecondarySheetContent({
	children = null,
	className,
	Footer = null,
	Header = null,
}: {
	children?: ReactNode;
	className?: string | null;
	Footer?: ReactNode;
	Header?: ReactNode;
}) {
	const sheet = useSheetV2();

	return (
		<Portal nodeId={sheet.secondaryContentId} noDelay>
			<div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
				<CustomSheetContent
					Header={Header}
					className={cn("flex flex-col", className)}
					secondary
				>
					{children}
				</CustomSheetContent>
				{Footer}
			</div>
		</Portal>
	);
}

const SheetV2 = Object.assign(CustomSheetV2, {
	CloseSecondary,
	Content: CustomSheetContent,
	Default: BaseSheet,
	Description: SheetDescription,
	Footer: SheetFooter,
	Header: SheetHeader,
	MultiContent: MultiSheetContent,
	Portal: CustomSheetContentPortal,
	PrimaryContent,
	ScrollArea: CustomSheetContent,
	SecondaryContent: SecondarySheetContent,
	SecondaryFooter,
	SecondaryHeader,
	Title: SheetTitle,
});

export default SheetV2;
