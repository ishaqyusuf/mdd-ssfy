"use client";

import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

import { Dialog } from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import type { SheetContentProps } from "@gnd/ui/sheet";

import Portal from "../_v1/portal";

const sheetContentVariant = cva("flex w-full flex-col", {
	variants: {
		floating: {
			true: "md:mt-[2vh] md:mx-4 md:h-[96vh]",
		},
		rounded: {
			true: "md:rounded-xl",
		},
		height: {
			default: "",
			sm: "sm:h-[45vh]",
			md: "sm:h-[65vh]",
			lg: "sm:h-[85vh]",
		},
		size: {
			"5xl": "sm:max-w-5xl",
			"4xl": "sm:max-w-4xl",
			"3xl": "sm:max-w-3xl",
			"2xl": "sm:max-w-2xl",
			xl: "sm:max-w-xl",
			default: "",
			lg: "sm:max-w-lg",
			sm: "sm:max-w-sm",
			md: "sm:max-w-md",
		},
	},
	defaultVariants: {
		height: "default",
	},
});

interface Props
	extends SheetContentProps,
		VariantProps<typeof sheetContentVariant> {
	children?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	title?: React.ReactNode;
	description?: React.ReactNode;
	className?: string;
	titleAsChild?: boolean;
	descriptionAsChild?: boolean;
}

function CustomModalBase({
	children,
	open,
	title,
	onOpenChange,
	description,
	className,
	titleAsChild = false,
	descriptionAsChild = false,
	...props
}: Props) {
	const fallbackTitle =
		typeof title === "string" && title.trim() ? title : "Dialog title";
	const fallbackDescription =
		typeof description === "string" && description.trim()
			? description
			: "Dialog details.";
	const variantProps = {
		floating: props.floating,
		rounded: props.rounded,
		height: props.height,
		size: props.size,
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<Dialog.Content
				id="customModalContent"
				{...props}
				className={cn("px-4", sheetContentVariant(variantProps), className)}
			>
				<Dialog.Header>
					{titleAsChild ? (
						<>
							<Dialog.Title className="sr-only">{fallbackTitle}</Dialog.Title>
							<div id="customModalTitle" />
						</>
					) : (
						<Dialog.Title id="customModalTitle">{title}</Dialog.Title>
					)}
					{!description ? null : descriptionAsChild ? (
						<>
							<Dialog.Description className="sr-only">
								{fallbackDescription}
							</Dialog.Description>
							<div id="customModalDescription" />
						</>
					) : (
						<Dialog.Description id="customModalDescription">
							{description}
						</Dialog.Description>
					)}
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

export function CustomModalPortal({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Portal nodeId="customModalContent">{children}</Portal>;
}

interface CustomModalContentProps
	extends ComponentPropsWithoutRef<typeof ScrollArea> {}

export function CustomModalContent({
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
			<Dialog.Footer className={cn(className)}>{children}</Dialog.Footer>
		</CustomModalPortal>
	);
}

export const CustomModal = Object.assign(CustomModalBase, {
	Content: CustomModalContent,
	Portal: CustomModalPortal,
	Footer,
	Title,
	Description,
});
