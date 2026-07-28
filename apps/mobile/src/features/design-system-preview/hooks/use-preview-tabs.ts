import { useState } from "react";

export function usePreviewTabs(initialTab: string) {
	const [activeTab, setActiveTab] = useState(initialTab);

	return {
		activeTab,
		setActiveTab,
	};
}
