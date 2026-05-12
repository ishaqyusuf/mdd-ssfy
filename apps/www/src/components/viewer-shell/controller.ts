import type { ReactNode } from "react";

export type ViewerShellSize = "default" | "wide" | "fullscreen";

export type ViewerShellAction = {
	id: string;
	label: string;
	icon?: ReactNode;
	onClick: () => void;
	disabled?: boolean;
};

export type ViewerShellInput = {
	id?: string;
	title: ReactNode;
	subtitle?: ReactNode;
	icon?: ReactNode;
	content: ReactNode;
	actions?: ViewerShellAction[];
	size?: ViewerShellSize;
	closeOnOutsideClick?: boolean;
	onClose?: () => void;
};

type ViewerShellEvent =
	| { type: "open"; viewer: ViewerShellInput }
	| { type: "close" };

type ViewerShellListener = (event: ViewerShellEvent) => void;

const listeners = new Set<ViewerShellListener>();

export function subscribeViewerShell(listener: ViewerShellListener) {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}

export function openViewerShell(input: ViewerShellInput) {
	if (!listeners.size) {
		return false;
	}

	for (const listener of listeners) {
		listener({ type: "open", viewer: input });
	}

	return true;
}

export function closeViewerShell() {
	for (const listener of listeners) {
		listener({ type: "close" });
	}
}
