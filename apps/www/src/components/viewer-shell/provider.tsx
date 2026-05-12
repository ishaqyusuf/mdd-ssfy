"use client";

import type { ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	type ViewerShellInput,
	closeViewerShell,
	openViewerShell,
	subscribeViewerShell,
} from "./controller";
import { ViewerShell } from "./viewer-shell";

type ViewerShellContextValue = {
	activeViewer: ViewerShellInput | null;
	isOpen: boolean;
	openViewer: (viewer: ViewerShellInput) => void;
	closeViewer: () => void;
};

const ViewerShellContext = createContext<ViewerShellContextValue | null>(null);

export function ViewerShellProvider({ children }: { children: ReactNode }) {
	const [activeViewer, setActiveViewer] = useState<ViewerShellInput | null>(
		null,
	);

	const closeViewer = useCallback(() => {
		setActiveViewer((current) => {
			current?.onClose?.();
			return null;
		});
	}, []);

	const openViewer = useCallback((viewer: ViewerShellInput) => {
		setActiveViewer(viewer);
	}, []);

	useEffect(() => {
		return subscribeViewerShell((event) => {
			if (event.type === "open") {
				setActiveViewer(event.viewer);
				return;
			}

			closeViewer();
		});
	}, [closeViewer]);

	const value = useMemo(
		() => ({
			activeViewer,
			isOpen: !!activeViewer,
			openViewer,
			closeViewer,
		}),
		[activeViewer, closeViewer, openViewer],
	);

	return (
		<ViewerShellContext.Provider value={value}>
			{children}
			<ViewerShell viewer={activeViewer} onClose={closeViewer} />
		</ViewerShellContext.Provider>
	);
}

export function useViewerShell() {
	const context = useContext(ViewerShellContext);

	if (!context) {
		throw new Error("useViewerShell must be used within ViewerShellProvider");
	}

	return context;
}

export { closeViewerShell, openViewerShell };
