"use client";

import { Chat, type ChatSubmitData } from "@/components/chat";
import { useAuth } from "@/hooks/use-auth";
import { generateRandomString } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
	TAB_RECORDING_FRAME_INTERVAL_MS,
	TAB_RECORDING_FRAME_RATE,
	canvasToPngBlob,
	captureCurrentTabCanvas,
	createCurrentTabRecordingCanvas,
	drawCurrentTabFrame as drawCurrentTabFrameToCanvas,
} from "./current-tab-capture";
import { RecordingToolbar } from "./recording-toolbar";
import { formatBugReportDuration } from "./status";

const MAX_RECORDING_MS = 90_000;
const MAX_RECORDING_BYTES = 250 * 1024 * 1024;
const MAX_VOICE_MS = 10 * 60_000;
const MAX_VOICE_BYTES = 25 * 1024 * 1024;
const BUG_REPORT_UPLOAD_URL = "/api/bug-reports/upload";

type CaptureType = "SCREENSHOT" | "VIDEO";
type CaptureState =
	| "idle"
	| "requesting"
	| "capturing"
	| "recording"
	| "preview"
	| "uploading";
type VoiceState = "idle" | "recording" | "preview";
type DeliveryState =
	| "PENDING"
	| "PROCESSING"
	| "CREATED"
	| "RETRY_WAIT"
	| "FAILED"
	| "UNCONFIGURED"
	| "UNCERTAIN";
type SubmissionReceipt = {
	id: string;
	delivery?: {
		state: DeliveryState;
		issueKey?: string | null;
		issueUrl?: string | null;
	} | null;
};
type UploadedEvidence = {
	intentId: string;
	url: string;
	pathname: string;
	contentType: string;
	size: number;
	filename: string;
};

function createSubmissionId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	const bytes = new Uint8Array(16);
	if (typeof crypto !== "undefined") {
		crypto.getRandomValues(bytes);
	} else {
		for (let index = 0; index < bytes.length; index += 1) {
			bytes[index] = Math.floor(Math.random() * 256);
		}
	}
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
	return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function deliveryMessage(state?: DeliveryState) {
	switch (state) {
		case "CREATED":
			return "Sent to developers.";
		case "RETRY_WAIT":
			return "Report saved. Delivery will retry.";
		case "FAILED":
		case "UNCONFIGURED":
			return "Report saved. Delivery needs attention.";
		case "UNCERTAIN":
			return "Report saved. Checking delivery.";
		default:
			return "Report saved. Sending to developers.";
	}
}

function sanitizeFilePart(value: string) {
	return value
		.replace(/[^a-z0-9._-]+/gi, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase();
}

function getRecorderMimeType(kind: "audio" | "video") {
	if (typeof MediaRecorder === "undefined") return "";
	const candidates =
		kind === "audio"
			? ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
			: [
					"video/webm;codecs=vp9,opus",
					"video/webm;codecs=vp8,opus",
					"video/webm",
				];
	return (
		candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ||
		""
	);
}

function getPrimaryContentType(blob: Blob, captureType: CaptureType) {
	if (captureType === "SCREENSHOT") {
		if (blob.type.startsWith("image/")) return blob.type;
		return "image/png";
	}
	if (blob.type.startsWith("video/webm")) return "video/webm";
	if (blob.type.startsWith("video/")) return blob.type;
	return "video/webm";
}

function getAudioContentType(blob: Blob) {
	if (blob.type.startsWith("audio/webm")) return "audio/webm";
	if (blob.type.startsWith("audio/")) return blob.type;
	return "audio/webm";
}

function extensionForContentType(contentType: string) {
	if (contentType.includes("png")) return "png";
	if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
	if (contentType.includes("mp4")) return "mp4";
	return "webm";
}

function stopStream(stream: MediaStream | null) {
	if (!stream) return;
	for (const track of stream.getTracks()) {
		track.stop();
	}
}

type BugReportButtonProps = {
	presentation?: "header" | "menu-item";
	hideTrigger?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

type BugReportTriggerProps = {
	presentation?: "header" | "menu-item";
	onOpen: () => void;
};

export function BugReportTrigger({
	presentation = "header",
	onOpen,
}: BugReportTriggerProps) {
	const auth = useAuth();
	const isMenuItem = presentation === "menu-item";

	if (!auth.can?.submitBugReport) return null;

	return (
		<Button
			type="button"
			variant={isMenuItem ? "ghost" : "secondary"}
			size={isMenuItem ? "sm" : "icon"}
			className={
				isMenuItem
					? "h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm font-medium"
					: "h-8 w-8 rounded-full"
			}
			aria-label="Report a bug"
			title="Report a bug"
			onClick={onOpen}
		>
			<Icons.AlertCircle className="size-4" />
			{isMenuItem ? <span>Report a bug</span> : null}
		</Button>
	);
}

export function BugReportButton({
	presentation = "header",
	hideTrigger = false,
	open: controlledOpen,
	onOpenChange,
}: BugReportButtonProps = {}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [internalOpen, setInternalOpen] = useState(false);
	const [captureType, setCaptureType] = useState<CaptureType>("SCREENSHOT");
	const [state, setState] = useState<CaptureState>("idle");
	const [voiceState, setVoiceState] = useState<VoiceState>("idle");
	const [micEnabled, setMicEnabled] = useState(true);
	const [primaryBlob, setPrimaryBlob] = useState<Blob | null>(null);
	const [primaryPreviewUrl, setPrimaryPreviewUrl] = useState<string | null>(
		null,
	);
	const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
	const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
	const [durationMs, setDurationMs] = useState(0);
	const [voiceDurationMs, setVoiceDurationMs] = useState(0);
	const [progress, setProgress] = useState(0);
	const [submissionId, setSubmissionId] = useState(createSubmissionId);
	const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const voiceChunksRef = useRef<Blob[]>([]);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const voiceRecorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const voiceStreamRef = useRef<MediaStream | null>(null);
	const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const voiceStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const startedAtRef = useRef<number>(0);
	const voiceStartedAtRef = useRef<number>(0);
	const frameRenderingRef = useRef(false);
	const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const microphoneRecordedRef = useRef(false);
	const recordingCanceledRef = useRef(false);
	const detachedRecordingRef = useRef(false);
	const recordingGenerationRef = useRef(0);
	const voiceGenerationRef = useRef(0);
	const capturePageUrlRef = useRef<string | null>(null);
	const primaryUploadRef = useRef<UploadedEvidence | null>(null);
	const audioUploadRef = useRef<UploadedEvidence | null>(null);
	const canReport = Boolean(auth.can?.submitBugReport);
	const open = controlledOpen ?? internalOpen;

	function setOpen(nextOpen: boolean) {
		if (controlledOpen === undefined) {
			setInternalOpen(nextOpen);
		}
		onOpenChange?.(nextOpen);
	}

	const createReport = useMutation(
		trpc.bugReports.create.mutationOptions({
			async onSuccess(data) {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.bugReports.mine.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.bugReports.adminList.queryKey(),
					}),
				]);
				setReceipt(data as SubmissionReceipt);
				setState("preview");
			},
		}),
	);
	const createUploadIntent = useMutation(
		trpc.bugReports.createUploadIntent.mutationOptions(),
	);

	useEffect(() => {
		return () => {
			recordingGenerationRef.current += 1;
			voiceGenerationRef.current += 1;
			stopCaptureTracks();
			stopVoiceTracks();
		};
	}, []);

	useEffect(() => {
		return () => {
			if (primaryPreviewUrl) URL.revokeObjectURL(primaryPreviewUrl);
		};
	}, [primaryPreviewUrl]);

	useEffect(() => {
		return () => {
			if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
		};
	}, [voicePreviewUrl]);

	if (!canReport) return null;

	function stopCaptureTracks() {
		if (stopTimerRef.current) {
			clearTimeout(stopTimerRef.current);
			stopTimerRef.current = null;
		}
		if (frameTimerRef.current) {
			clearInterval(frameTimerRef.current);
			frameTimerRef.current = null;
		}
		stopStream(streamRef.current);
		streamRef.current = null;
		recordingCanvasRef.current = null;
		frameRenderingRef.current = false;
	}

	function stopVoiceTracks() {
		if (voiceStopTimerRef.current) {
			clearTimeout(voiceStopTimerRef.current);
			voiceStopTimerRef.current = null;
		}
		stopStream(voiceStreamRef.current);
		voiceStreamRef.current = null;
	}

	function resetCapture() {
		recordingGenerationRef.current += 1;
		detachedRecordingRef.current = false;
		if (primaryPreviewUrl) URL.revokeObjectURL(primaryPreviewUrl);
		const recorder = recorderRef.current;
		if (recorder && recorder.state !== "inactive") {
			recordingCanceledRef.current = true;
			recorder.stop();
		} else {
			stopCaptureTracks();
		}
		recorderRef.current = null;
		microphoneRecordedRef.current = false;
		chunksRef.current = [];
		setPrimaryBlob(null);
		setPrimaryPreviewUrl(null);
		setDurationMs(0);
		setProgress(0);
		setState("idle");
		primaryUploadRef.current = null;
	}

	function resetVoiceNote() {
		voiceGenerationRef.current += 1;
		if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
		stopVoiceTracks();
		voiceRecorderRef.current = null;
		voiceChunksRef.current = [];
		setVoiceBlob(null);
		setVoicePreviewUrl(null);
		setVoiceDurationMs(0);
		setVoiceState("idle");
		audioUploadRef.current = null;
	}

	function resetComposer() {
		resetCapture();
		resetVoiceNote();
		setCaptureType("SCREENSHOT");
		setReceipt(null);
		setSubmissionId(createSubmissionId());
		capturePageUrlRef.current = null;
	}

	async function captureScreenshot() {
		resetCapture();
		setState("capturing");
		capturePageUrlRef.current = window.location.href;

		try {
			const canvas = await captureCurrentTabCanvas();
			const blob = await canvasToPngBlob(canvas);
			if (!blob) {
				throw new Error("Unable to capture screenshot.");
			}

			setPrimaryBlob(blob);
			setPrimaryPreviewUrl(URL.createObjectURL(blob));
			setDurationMs(0);
			setCaptureType("SCREENSHOT");
			setState("preview");
		} catch (error) {
			setState("idle");
			toast({
				title: "Screenshot was not captured",
				description:
					error instanceof Error ? error.message : "Please try again.",
				variant: "destructive",
			});
		}
	}

	async function drawCurrentTabFrame(recordingCanvas: HTMLCanvasElement) {
		if (frameRenderingRef.current) return;
		frameRenderingRef.current = true;
		try {
			await drawCurrentTabFrameToCanvas(recordingCanvas);
		} finally {
			frameRenderingRef.current = false;
		}
	}

	async function startRecording() {
		if (typeof MediaRecorder === "undefined") {
			toast({
				title: "Tab recording is not supported in this browser",
				variant: "destructive",
			});
			return;
		}
		if (!HTMLCanvasElement.prototype.captureStream) {
			toast({
				title: "Current-tab recording is not supported in this browser",
				variant: "destructive",
			});
			return;
		}

		resetCapture();
		const generation = ++recordingGenerationRef.current;
		setCaptureType("VIDEO");
		setState("requesting");
		capturePageUrlRef.current = window.location.href;
		recordingCanceledRef.current = false;

		try {
			const recordingCanvas = createCurrentTabRecordingCanvas();
			recordingCanvasRef.current = recordingCanvas;
			await drawCurrentTabFrame(recordingCanvas);
			if (generation !== recordingGenerationRef.current) return;

			const tabStream = recordingCanvas.captureStream(TAB_RECORDING_FRAME_RATE);
			let micStream: MediaStream | null = null;
			if (micEnabled) {
				try {
					micStream = await navigator.mediaDevices.getUserMedia({
						audio: true,
					});
				} catch {
					toast({
						title: "Microphone unavailable",
						description: "Recording will continue without microphone audio.",
					});
				}
			}
			if (generation !== recordingGenerationRef.current) {
				stopStream(tabStream);
				stopStream(micStream);
				return;
			}

			const combinedStream = new MediaStream([
				...tabStream.getVideoTracks(),
				...(micStream?.getAudioTracks() ?? []),
			]);
			streamRef.current = combinedStream;
			microphoneRecordedRef.current = Boolean(
				micStream?.getAudioTracks().length,
			);
			chunksRef.current = [];
			startedAtRef.current = Date.now();
			frameTimerRef.current = setInterval(() => {
				const canvas = recordingCanvasRef.current;
				if (canvas) {
					void drawCurrentTabFrame(canvas).catch((error) => {
						toast({
							title: "Recording stopped",
							description:
								error instanceof Error
									? error.message
									: "The page could not be captured.",
							variant: "destructive",
						});
						cancelRecording();
					});
				}
			}, TAB_RECORDING_FRAME_INTERVAL_MS);

			const mimeType = getRecorderMimeType("video");
			const recorder = new MediaRecorder(
				combinedStream,
				mimeType ? { mimeType } : undefined,
			);
			recorderRef.current = recorder;
			recorder.onerror = () => {
				toast({
					title: "Recording stopped",
					description: "The browser could not continue the recording.",
					variant: "destructive",
				});
				cancelRecording();
			};
			recorder.ondataavailable = (event) => {
				if (event.data.size <= 0) return;
				const nextSize =
					chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0) +
					event.data.size;
				if (nextSize > MAX_RECORDING_BYTES) {
					toast({
						title: "Recording stopped",
						description: "The recording reached the 250 MB limit.",
						variant: "destructive",
					});
					cancelRecording();
					return;
				}
				chunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				if (recordingCanceledRef.current) {
					recordingCanceledRef.current = false;
					chunksRef.current = [];
					setDurationMs(0);
					setPrimaryBlob(null);
					setPrimaryPreviewUrl(null);
					setState("idle");
					detachedRecordingRef.current = false;
					setOpen(true);
					stopCaptureTracks();
					return;
				}
				const stoppedAt = Date.now();
				const nextDuration = Math.min(
					stoppedAt - startedAtRef.current,
					MAX_RECORDING_MS,
				);
				const blob = new Blob(chunksRef.current, {
					type: recorder.mimeType || "video/webm",
				});
				if (blob.size === 0) {
					setDurationMs(0);
					setPrimaryBlob(null);
					setPrimaryPreviewUrl(null);
					setState("idle");
					detachedRecordingRef.current = false;
					setOpen(true);
					stopCaptureTracks();
					toast({
						title: "Recording was empty",
						description: "Please record the issue again.",
						variant: "destructive",
					});
					return;
				}
				setDurationMs(nextDuration);
				setPrimaryBlob(blob);
				setPrimaryPreviewUrl(URL.createObjectURL(blob));
				setState("preview");
				detachedRecordingRef.current = false;
				setOpen(true);
				stopCaptureTracks();
			};
			recorder.start(1000);
			setState("recording");
			detachedRecordingRef.current = true;
			setOpen(false);
			stopTimerRef.current = setTimeout(() => {
				stopRecording();
			}, MAX_RECORDING_MS);
		} catch (error) {
			stopCaptureTracks();
			setState("idle");
			toast({
				title: "Recording was not started",
				description:
					error instanceof Error ? error.message : "Please try again.",
				variant: "destructive",
			});
		}
	}

	function cancelRecording() {
		recordingCanceledRef.current = true;
		const recorder = recorderRef.current;
		if (recorder && recorder.state !== "inactive") {
			recorder.stop();
		} else {
			stopCaptureTracks();
		}
		chunksRef.current = [];
		microphoneRecordedRef.current = false;
		setDurationMs(0);
		setPrimaryBlob(null);
		setPrimaryPreviewUrl(null);
		setState("idle");
		detachedRecordingRef.current = false;
		setOpen(true);
	}

	function stopRecording() {
		const recorder = recorderRef.current;
		if (recorder && recorder.state !== "inactive") {
			recorder.stop();
		} else {
			stopCaptureTracks();
			setState("idle");
		}
	}

	async function startVoiceNote() {
		if (!navigator.mediaDevices?.getUserMedia) {
			toast({
				title: "Voice notes are not supported in this browser",
				variant: "destructive",
			});
			return;
		}
		if (typeof MediaRecorder === "undefined") {
			toast({
				title: "Audio recording is not supported in this browser",
				variant: "destructive",
			});
			return;
		}

		resetVoiceNote();
		const generation = ++voiceGenerationRef.current;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			if (generation !== voiceGenerationRef.current) {
				stopStream(stream);
				return;
			}
			voiceStreamRef.current = stream;
			voiceChunksRef.current = [];
			voiceStartedAtRef.current = Date.now();
			const mimeType = getRecorderMimeType("audio");
			const recorder = new MediaRecorder(
				stream,
				mimeType ? { mimeType } : undefined,
			);
			voiceRecorderRef.current = recorder;
			recorder.ondataavailable = (event) => {
				if (event.data.size <= 0) return;
				const nextSize =
					voiceChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0) +
					event.data.size;
				if (nextSize > MAX_VOICE_BYTES) {
					toast({
						title: "Voice note stopped",
						description: "The voice note reached the 25 MB limit.",
						variant: "destructive",
					});
					stopVoiceNote();
					return;
				}
				voiceChunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				const blob = new Blob(voiceChunksRef.current, {
					type: recorder.mimeType || "audio/webm",
				});
				setVoiceDurationMs(Date.now() - voiceStartedAtRef.current);
				setVoiceBlob(blob);
				setVoicePreviewUrl(URL.createObjectURL(blob));
				setVoiceState("preview");
				stopVoiceTracks();
			};
			recorder.start(1000);
			setVoiceState("recording");
			voiceStopTimerRef.current = setTimeout(stopVoiceNote, MAX_VOICE_MS);
		} catch (error) {
			stopVoiceTracks();
			setVoiceState("idle");
			toast({
				title: "Voice note was not started",
				description:
					error instanceof Error ? error.message : "Please try again.",
				variant: "destructive",
			});
		}
	}

	function stopVoiceNote() {
		const recorder = voiceRecorderRef.current;
		if (recorder && recorder.state !== "inactive") {
			recorder.stop();
		} else {
			stopVoiceTracks();
			setVoiceState("idle");
		}
	}

	async function uploadBlob(
		blob: Blob,
		options: {
			contentType: string;
			filenamePrefix: string;
			mediaKind: "VIDEO" | "SCREENSHOT" | "AUDIO";
		},
	) {
		const intent = await createUploadIntent.mutateAsync({
			mediaKind: options.mediaKind,
			contentType: options.contentType,
			size: blob.size,
		});
		const extension = extensionForContentType(options.contentType);
		const fileName = `${options.filenamePrefix}-${generateRandomString(8)}.${extension}`;
		const safeName = sanitizeFilePart(fileName);
		const pathname = intent.pathname;
		const file = new File([blob], safeName, {
			type: options.contentType,
		});
		const uploaded = await upload(pathname, file, {
			access: "private",
			handleUploadUrl: BUG_REPORT_UPLOAD_URL,
			contentType: options.contentType,
			multipart: file.size > 8 * 1024 * 1024,
			clientPayload: JSON.stringify({ intentId: intent.id }),
			onUploadProgress({ percentage }) {
				setProgress(Math.round(percentage));
			},
		});

		return {
			intentId: intent.id,
			url: uploaded.url,
			pathname: uploaded.pathname || pathname,
			contentType: options.contentType,
			size: blob.size,
			filename: safeName,
		};
	}

	async function submitReport(description?: string) {
		if (!primaryBlob) {
			throw new Error("Capture a screenshot or recording before sending.");
		}
		setState("uploading");
		setProgress(0);

		try {
			const primaryContentType = getPrimaryContentType(
				primaryBlob,
				captureType,
			);
			const primaryUpload =
				primaryUploadRef.current ??
				(await uploadBlob(primaryBlob, {
					contentType: primaryContentType,
					mediaKind: captureType,
					filenamePrefix:
						captureType === "SCREENSHOT" ? "screenshot" : "recording",
				}));
			primaryUploadRef.current = primaryUpload;
			const audioUpload = voiceBlob
				? (audioUploadRef.current ??
					(await uploadBlob(voiceBlob, {
						contentType: getAudioContentType(voiceBlob),
						mediaKind: "AUDIO",
						filenamePrefix: "voice-note",
					})))
				: null;
			if (audioUpload) audioUploadRef.current = audioUpload;

			await createReport.mutateAsync({
				submissionId,
				uploadIntentId: primaryUpload.intentId,
				audioUploadIntentId: audioUpload?.intentId ?? null,
				captureType,
				description: description?.trim() || null,
				currentUrl: capturePageUrlRef.current ?? window.location.href,
				userAgent: navigator.userAgent,
				durationMs: captureType === "VIDEO" ? Math.max(1, durationMs) : null,
				microphoneEnabled:
					captureType === "VIDEO" ? microphoneRecordedRef.current : false,
				upload: primaryUpload,
				audio: audioUpload
					? {
							upload: audioUpload,
							durationMs: Math.max(1, voiceDurationMs),
							transcriptionStatus: "PENDING",
							transcriptionProvider: "pending",
						}
					: null,
			});
		} catch (error) {
			setState("preview");
			throw error;
		}
	}

	async function submitChatReport(data: ChatSubmitData) {
		await submitReport(data.message);
	}

	const actionDisabled =
		state === "requesting" || state === "capturing" || state === "uploading";
	return (
		<>
			{state === "recording" ? (
				<RecordingToolbar
					startedAt={startedAtRef.current}
					maxDurationMs={MAX_RECORDING_MS}
					onCancel={cancelRecording}
					onFinish={stopRecording}
				/>
			) : null}
			{hideTrigger ? null : (
				<BugReportTrigger
					presentation={presentation}
					onOpen={() => setOpen(true)}
				/>
			)}
			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (!nextOpen && detachedRecordingRef.current) {
						setOpen(false);
						return;
					}
					if (!nextOpen && state === "recording") {
						cancelRecording();
					}
					if (!nextOpen && voiceState === "recording") {
						stopVoiceNote();
					}
					if (!nextOpen) resetComposer();
					setOpen(nextOpen);
				}}
			>
				<DialogContent
					className="max-h-[90vh] max-w-3xl overflow-hidden p-0"
					data-bug-report-ignore="true"
				>
					<DialogHeader className="border-b px-5 py-4">
						<DialogTitle>Report a bug</DialogTitle>
						<DialogDescription>
							Capture this app tab, add context, and attach an optional voice
							note.
						</DialogDescription>
					</DialogHeader>

					<div className="max-h-[calc(90vh-156px)] overflow-auto px-5 py-4">
						<div className="space-y-4">
							{receipt ? (
								<div className="space-y-3 rounded-md border bg-muted/30 p-4">
									<div>
										<p className="font-medium">
											{deliveryMessage(receipt.delivery?.state)}
										</p>
										<p className="text-xs text-muted-foreground">
											Report {receipt.id}
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										<Button asChild type="button" size="sm">
											<Link
												href={`/support/bug-reports?reportId=${encodeURIComponent(receipt.id)}`}
											>
												Open report
											</Link>
										</Button>
										{receipt.delivery?.state === "CREATED" &&
										receipt.delivery.issueUrl ? (
											<Button asChild type="button" size="sm" variant="outline">
												<a
													href={receipt.delivery.issueUrl}
													target="_blank"
													rel="noreferrer"
												>
													{receipt.delivery.issueKey || "GitHub issue"}
												</a>
											</Button>
										) : null}
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={resetComposer}
										>
											Start another report
										</Button>
									</div>
								</div>
							) : null}
							{!receipt ? (
								<>
									<div className="grid gap-2 sm:grid-cols-2">
										<Button
											type="button"
											variant={
												captureType === "SCREENSHOT" ? "default" : "outline"
											}
											disabled={state === "recording" || actionDisabled}
											onClick={() => {
												setCaptureType("SCREENSHOT");
												void captureScreenshot();
											}}
										>
											<Icons.Camera className="mr-2 size-4" />
											Screenshot
										</Button>
										<Button
											type="button"
											variant={captureType === "VIDEO" ? "default" : "outline"}
											disabled={state === "recording" || actionDisabled}
											onClick={() => {
												setCaptureType("VIDEO");
												resetCapture();
											}}
										>
											<Icons.AlertCircle className="mr-2 size-4" />
											Record Tab
										</Button>
									</div>

									{captureType === "VIDEO" ? (
										<div className="flex items-center justify-between gap-4 rounded-md border p-3">
											<div>
												<Label htmlFor="bug-report-mic">Microphone</Label>
												<p className="text-xs text-muted-foreground">
													Include your voice in the current-tab recording.
												</p>
											</div>
											<Switch
												id="bug-report-mic"
												checked={micEnabled}
												disabled={
													state === "recording" || state === "uploading"
												}
												onCheckedChange={setMicEnabled}
											/>
										</div>
									) : null}

									<div className="overflow-hidden rounded-md border bg-muted/20">
										{primaryPreviewUrl && captureType === "SCREENSHOT" ? (
											<img
												src={primaryPreviewUrl}
												alt="Bug report screenshot preview"
												className="aspect-video w-full object-contain"
											/>
										) : null}
										{primaryPreviewUrl && captureType === "VIDEO" ? (
											<video
												src={primaryPreviewUrl}
												controls
												className="aspect-video w-full bg-black"
											>
												<track kind="captions" />
											</video>
										) : null}
										{!primaryPreviewUrl ? (
											<div className="flex aspect-video w-full items-center justify-center border-dashed text-sm text-muted-foreground">
												{state === "recording"
													? "Recording in progress"
													: captureType === "SCREENSHOT"
														? "Your screenshot preview will appear here"
														: "Your recording preview will appear here"}
											</div>
										) : null}
										<div className="flex flex-wrap items-center gap-2 border-t bg-background px-3 py-2 text-xs text-muted-foreground">
											<Badge variant="outline">
												{captureType === "SCREENSHOT" ? "Screenshot" : "Video"}
											</Badge>
											{captureType === "VIDEO" ? (
												<span>
													Duration: {formatBugReportDuration(durationMs)}
												</span>
											) : null}
											{state === "uploading" ? (
												<span>Uploading {progress}%</span>
											) : null}
										</div>
									</div>

									<Chat
										channel="employee_document_review"
										messageRequired={false}
										payload={{
											captureType,
											hasVoiceNote: Boolean(voiceBlob),
											source: "bug_report",
										}}
										onSubmitData={submitChatReport}
										successMessage={false}
										className="rounded-md"
									>
										<Chat.Header>
											<div className="flex items-center gap-2">
												<Icons.MessageSquare className="size-4 text-muted-foreground" />
												<div className="text-sm font-medium">Bug chat</div>
												{voiceBlob ? (
													<Badge variant="outline">Voice note attached</Badge>
												) : null}
											</div>
										</Chat.Header>
										<Chat.Content placeholder="Describe what happened. If you attach a voice note, it will be queued for transcription." />
										<div className="space-y-3 px-3 pb-3">
											{voicePreviewUrl ? (
												<div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-2">
													<audio
														src={voicePreviewUrl}
														controls
														className="h-9 max-w-full flex-1"
													>
														<track kind="captions" />
													</audio>
													<span className="text-xs text-muted-foreground">
														{formatBugReportDuration(voiceDurationMs)}
													</span>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={resetVoiceNote}
													>
														<Icons.X className="mr-2 size-4" />
														Remove
													</Button>
												</div>
											) : null}
											<div className="flex flex-wrap items-center justify-between gap-2">
												<p className="text-xs text-muted-foreground">
													Voice transcription is stored as pending until the
													speech provider is wired.
												</p>
												{voiceState === "recording" ? (
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={stopVoiceNote}
													>
														<Icons.StopCircle className="mr-2 size-4" />
														Stop voice
													</Button>
												) : (
													<Button
														type="button"
														variant="outline"
														size="sm"
														disabled={state === "uploading"}
														onClick={() => void startVoiceNote()}
													>
														<Icons.MessageSquare className="mr-2 size-4" />
														{voiceBlob ? "Record again" : "Record voice"}
													</Button>
												)}
											</div>
										</div>
										<Chat.Footer>
											<p className="min-w-0 flex-1 text-xs text-muted-foreground">
												Send after the screenshot or recording is ready.
											</p>
											<Chat.SendButton
												label={state === "uploading" ? "Sending..." : "Send"}
											/>
										</Chat.Footer>
									</Chat>
								</>
							) : null}
						</div>
					</div>

					<DialogFooter className="sticky bottom-0 justify-center gap-2 border-t bg-background/95 px-5 py-3 backdrop-blur sm:justify-center sm:gap-2">
						<Button asChild type="button" variant="ghost">
							<Link href="/support/bug-reports">Issue Board</Link>
						</Button>
						{!receipt ? (
							<Button
								type="button"
								variant="outline"
								disabled={state === "uploading"}
								onClick={resetComposer}
							>
								Reset
							</Button>
						) : null}
						{receipt ? null : captureType === "SCREENSHOT" ? (
							<Button
								type="button"
								variant={primaryBlob ? "outline" : "default"}
								disabled={actionDisabled}
								onClick={() => void captureScreenshot()}
							>
								<Icons.Camera className="mr-2 size-4" />
								{primaryBlob ? "Retake" : "Take Screenshot"}
							</Button>
						) : state === "recording" ? (
							<>
								<Button
									type="button"
									variant="outline"
									onClick={cancelRecording}
								>
									<Icons.X className="mr-2 size-4" />
									Cancel Recording
								</Button>
								<Button type="button" onClick={stopRecording}>
									<Icons.StopCircle className="mr-2 size-4" />
									Finish Recording
								</Button>
							</>
						) : (
							<Button
								type="button"
								variant={primaryBlob ? "outline" : "default"}
								disabled={actionDisabled}
								onClick={() => void startRecording()}
							>
								<Icons.AlertCircle className="mr-2 size-4" />
								{primaryBlob ? "Record Again" : "Start Recording"}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
