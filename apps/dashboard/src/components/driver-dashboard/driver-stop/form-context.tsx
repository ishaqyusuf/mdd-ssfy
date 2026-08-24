"use client";

import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";

export const DRIVER_PROOF_DRAFT_VERSION = 1;

export type DriverProofAttachment = {
	clientId: string;
	fileName: string;
	contentType:
		| "image/png"
		| "image/jpeg"
		| "image/webp"
		| "image/avif"
		| "image/heic"
		| "image/heif";
	base64: string;
};

export type DriverProofFormValues = {
	requestId: string;
	receivedBy: string;
	note: string;
	noteType: "dispatch" | "pickup";
	signaturePath: string;
	attachments: DriverProofAttachment[];
};

type DraftEnvelope = {
	version: typeof DRIVER_PROOF_DRAFT_VERSION;
	savedAt: string;
	values: DriverProofFormValues;
};

type DriverProofDraftContextValue = {
	draftRecovered: boolean;
	savedAt: string | null;
	storageError: string | null;
	clearDraft: () => void;
};

const DriverProofDraftContext =
	createContext<DriverProofDraftContextValue | null>(null);

function createRequestId() {
	return `dispatch:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`;
}

function draftKey(dispatchId: number) {
	return `gnd.driver-proof-draft.v${DRIVER_PROOF_DRAFT_VERSION}:${dispatchId}`;
}

export function DriverStopFormContext({
	dispatchId,
	defaultReceivedBy,
	defaultNoteType,
	children,
}: {
	dispatchId: number;
	defaultReceivedBy?: string | null;
	defaultNoteType: "dispatch" | "pickup";
	children: ReactNode;
}) {
	const defaults = useMemo<DriverProofFormValues>(
		() => ({
			requestId: createRequestId(),
			receivedBy: defaultReceivedBy || "",
			note: "",
			noteType: defaultNoteType,
			signaturePath: "",
			attachments: [],
		}),
		[defaultNoteType, defaultReceivedBy],
	);
	const form = useForm<DriverProofFormValues>({ defaultValues: defaults });
	const [draftRecovered, setDraftRecovered] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);
	const [storageError, setStorageError] = useState<string | null>(null);

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(draftKey(dispatchId));
			if (!raw) return;
			const parsed = JSON.parse(raw) as DraftEnvelope;
			if (parsed.version !== DRIVER_PROOF_DRAFT_VERSION || !parsed.values) {
				window.localStorage.removeItem(draftKey(dispatchId));
				return;
			}
			form.reset(parsed.values);
			setSavedAt(parsed.savedAt);
			setDraftRecovered(true);
		} catch {
			setStorageError("A saved proof draft could not be restored.");
		}
	}, [dispatchId, form]);

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const subscription = form.watch((values) => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				try {
					const nextSavedAt = new Date().toISOString();
					const envelope: DraftEnvelope = {
						version: DRIVER_PROOF_DRAFT_VERSION,
						savedAt: nextSavedAt,
						values: values as DriverProofFormValues,
					};
					window.localStorage.setItem(
						draftKey(dispatchId),
						JSON.stringify(envelope),
					);
					setSavedAt(nextSavedAt);
					setStorageError(null);
				} catch {
					setStorageError(
						"This browser could not save the proof draft. Keep this sheet open until submission succeeds.",
					);
				}
			}, 300);
		});
		return () => {
			clearTimeout(timer);
			subscription.unsubscribe();
		};
	}, [dispatchId, form]);

	const clearDraft = () => {
		window.localStorage.removeItem(draftKey(dispatchId));
		form.reset({ ...defaults, requestId: createRequestId() });
		setDraftRecovered(false);
		setSavedAt(null);
		setStorageError(null);
	};

	return (
		<DriverProofDraftContext.Provider
			value={{ draftRecovered, savedAt, storageError, clearDraft }}
		>
			<FormProvider {...form}>{children}</FormProvider>
		</DriverProofDraftContext.Provider>
	);
}

export function useDriverProofDraft() {
	const value = useContext(DriverProofDraftContext);
	if (!value) {
		throw new Error(
			"useDriverProofDraft must be used within DriverStopFormContext",
		);
	}
	return value;
}
