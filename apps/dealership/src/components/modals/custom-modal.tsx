"use client";

import { cn } from "@gnd/ui/cn";
import { Dialog } from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import type { ComponentPropsWithoutRef } from "react";
import Portal from "../_v1/portal";

type CustomModalSize =
	| "default"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl"
	| "5xl";
type CustomModalHeight = "default" | "sm" | "md" | "lg";

const modalSizeClass: Record<CustomModalSize, string> = {
	default: "",
	sm: "sm:max-w-sm",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
	xl: "sm:max-w-xl",
	"2xl": "sm:max-w-2xl",
	"3xl": "sm:max-w-3xl",
	"4xl": "sm:max-w-4xl",
	"5xl": "sm:max-w-5xl",
};

const modalHeightClass: Record<CustomModalHeight, string> = {
	default: "",
	sm: "sm:h-[45vh]",
	md: "sm:h-[65vh]",
	lg: "sm:h-[85vh]",
};

type CustomModalProps = {
	children?: React.ReactNode;
	className?: string;
	description?: React.ReactNode;
	descriptionAsChild?: boolean;
	floating?: boolean;
	height?: CustomModalHeight;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	rounded?: boolean;
	size?: CustomModalSize;
	title?: React.ReactNode;
	titleAsChild?: boolean;
};

function CustomModalBase({
	children,
	className,
	description,
	descriptionAsChild = false,
	floating,
	height = "default",
	onOpenChange,
	open,
	rounded,
	size = "default",
	title,
	titleAsChild = false,
}: CustomModalProps) {
	const fallbackTitle =
		typeof title === "string" && title.trim() ? title : "Dialog title";
	const fallbackDescription =
		typeof description === "string" && description.trim()
			? description
			: "Dialog details.";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<Dialog.Content
				className={cn(
					"flex w-full flex-col px-4",
					floating ? "md:mx-4 md:mt-[2vh] md:h-[96vh]" : "",
					rounded ? "overflow-hidden md:rounded-xl" : "",
					modalHeightClass[height],
					modalSizeClass[size],
					className,
				)}
				id="customModalContent"
			>
				<Dialog.Header>
					{titleAsChild ? (
						<>
							<Dialog.Title className="sr-only">{fallbackTitle}</Dialog.Title>
							<div id="customModalTitle" />
						</>
					) : (
						<Dialog.Title>{title}</Dialog.Title>
					)}
					{description ? (
						descriptionAsChild ? (
							<>
								<Dialog.Description className="sr-only">
									{fallbackDescription}
								</Dialog.Description>
								<div id="customModalDescription" />
							</>
						) : (
							<Dialog.Description>{description}</Dialog.Description>
						)
					) : null}
				</Dialog.Header>
				{children}
			</Dialog.Content>
		</Dialog>
	);
}

function Title({ children }: { children: React.ReactNode }) {
	return (
		<Portal nodeId="customModalTitle" noDelay>
			{children}
		</Portal>
	);
}

function Description({ children }: { children: React.ReactNode }) {
	return (
		<Portal nodeId="customModalDescription" noDelay>
			{children}
		</Portal>
	);
}

function CustomModalPortal({ children }: { children: React.ReactNode }) {
	return <Portal nodeId="customModalContent">{children}</Portal>;
}

type CustomModalContentProps = ComponentPropsWithoutRef<typeof ScrollArea>;

function CustomModalContent({
	children,
	className,
	...props
}: CustomModalContentProps) {
	return (
		<ScrollArea
			className={cn("-mx-4 max-h-[70vh] flex-1 overflow-auto px-4", className)}
			{...props}
		>
			{children}
		</ScrollArea>
	);
}

function Footer({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<CustomModalPortal>
			<Dialog.Footer className={cn("md:rounded-b-xl", className)}>
				{children}
			</Dialog.Footer>
		</CustomModalPortal>
	);
}

export const CustomModal = Object.assign(CustomModalBase, {
	Content: CustomModalContent,
	Description,
	Footer,
	Portal: CustomModalPortal,
	Title,
});
