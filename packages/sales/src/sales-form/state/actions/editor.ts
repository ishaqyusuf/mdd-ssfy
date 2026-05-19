import type { SalesFormEditorState, SalesFormState } from "../types";

export function setSalesFormEditorState<TState extends SalesFormState>(
	state: TState,
	patch: Partial<SalesFormEditorState>,
): TState {
	const unchanged = Object.entries(patch).every(
		([key, value]) => state.editor[key as keyof SalesFormEditorState] === value,
	);
	if (unchanged) return state;

	return {
		...state,
		editor: {
			...state.editor,
			...patch,
		},
	};
}

