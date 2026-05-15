export type SalesFormSaveStatus =
	| "idle"
	| "saving"
	| "saved"
	| "error"
	| "stale";

export type SalesFormHeaderItemOption = {
	uid: string;
	label: string;
};
