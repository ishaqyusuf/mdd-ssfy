"use client";

import { useAuth } from "@/hooks/use-auth";
import { generateRandomString } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
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
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatBugReportDuration } from "./status";

const MAX_RECORDING_MS = 90_000;
const BUG_REPORT_UPLOAD_URL = "/api/bug-reports/upload";

type RecorderState =
    | "idle"
    | "requesting"
    | "recording"
    | "preview"
    | "uploading";

function sanitizeFilePart(value: string) {
    return value
        .replace(/[^a-z0-9._-]+/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
}

function getRecorderMimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
    ];
    return (
        candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ||
        ""
    );
}

function getUploadContentType(blob: Blob) {
    if (blob.type.startsWith("video/webm")) return "video/webm";
    if (blob.type.startsWith("video/")) return blob.type;
    return "video/webm";
}

export function BugReportButton() {
    const auth = useAuth();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<RecorderState>("idle");
    const [micEnabled, setMicEnabled] = useState(true);
    const [description, setDescription] = useState("");
    const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [durationMs, setDurationMs] = useState(0);
    const [progress, setProgress] = useState(0);
    const chunksRef = useRef<Blob[]>([]);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startedAtRef = useRef<number>(0);
    const microphoneRecordedRef = useRef(false);
    const canReport = Boolean(auth.can?.submitBugReport);

    const createReport = useMutation(
        trpc.bugReports.create.mutationOptions({
            async onSuccess() {
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: trpc.bugReports.mine.queryKey(),
                    }),
                    queryClient.invalidateQueries({
                        queryKey: trpc.bugReports.adminList.queryKey(),
                    }),
                ]);
                toast({
                    title: "Bug report submitted",
                    variant: "success",
                });
                resetRecorder();
                setDescription("");
                setOpen(false);
            },
            onError(error) {
                toast({
                    title: "Unable to submit bug report",
                    description: error.message,
                    variant: "destructive",
                });
                setState("preview");
            },
        }),
    );

    useEffect(() => {
        return () => {
            stopRecordingTracks();
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    if (!canReport) return null;

    function stopRecordingTracks() {
        if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current);
            stopTimerRef.current = null;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }

    function resetRecorder() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        stopRecordingTracks();
        recorderRef.current = null;
        microphoneRecordedRef.current = false;
        chunksRef.current = [];
        setRecordingBlob(null);
        setPreviewUrl(null);
        setDurationMs(0);
        setProgress(0);
        setState("idle");
    }

    async function startRecording() {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            toast({
                title: "Screen recording is not supported in this browser",
                variant: "destructive",
            });
            return;
        }
        if (typeof MediaRecorder === "undefined") {
            toast({
                title: "Recording is not supported in this browser",
                variant: "destructive",
            });
            return;
        }

        resetRecorder();
        setState("requesting");

        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
            });
            let micStream: MediaStream | null = null;
            if (micEnabled) {
                try {
                    micStream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                    });
                } catch {
                    toast({
                        title: "Microphone unavailable",
                        description:
                            "Recording will continue without microphone audio.",
                    });
                }
            }

            const combinedStream = new MediaStream([
                ...displayStream.getVideoTracks(),
                ...(micStream?.getAudioTracks() ?? []),
            ]);
            streamRef.current = combinedStream;
            microphoneRecordedRef.current = Boolean(
                micStream?.getAudioTracks().length,
            );
            chunksRef.current = [];
            startedAtRef.current = Date.now();

            const mimeType = getRecorderMimeType();
            const recorder = new MediaRecorder(
                combinedStream,
                mimeType ? { mimeType } : undefined,
            );
            recorderRef.current = recorder;
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };
            recorder.onstop = () => {
                const stoppedAt = Date.now();
                const nextDuration = Math.min(
                    stoppedAt - startedAtRef.current,
                    MAX_RECORDING_MS,
                );
                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || "video/webm",
                });
                const nextPreviewUrl = URL.createObjectURL(blob);
                setDurationMs(nextDuration);
                setRecordingBlob(blob);
                setPreviewUrl(nextPreviewUrl);
                setState("preview");
                stopRecordingTracks();
            };
            displayStream.getVideoTracks()[0]?.addEventListener("ended", () => {
                stopRecording();
            });
            recorder.start();
            setState("recording");
            stopTimerRef.current = setTimeout(() => {
                stopRecording();
            }, MAX_RECORDING_MS);
        } catch (error) {
            stopRecordingTracks();
            setState("idle");
            toast({
                title: "Recording was not started",
                description:
                    error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        }
    }

    function stopRecording() {
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
        } else {
            stopRecordingTracks();
            setState("idle");
        }
    }

    async function submitReport() {
        if (!recordingBlob) return;
        setState("uploading");
        setProgress(0);

        try {
            const fileName = `${Date.now()}-${generateRandomString(8)}.webm`;
            const safeName = sanitizeFilePart(fileName);
            const pathname = `bug-reports/${auth.id || "user"}/${safeName}`;
            const contentType = getUploadContentType(recordingBlob);
            const file = new File([recordingBlob], safeName, {
                type: contentType,
            });
            const uploaded = await upload(pathname, file, {
                access: "public",
                handleUploadUrl: BUG_REPORT_UPLOAD_URL,
                contentType,
                multipart: file.size > 8 * 1024 * 1024,
                onUploadProgress({ percentage }) {
                    setProgress(Math.round(percentage));
                },
            });

            createReport.mutate({
                description: description.trim() || null,
                currentUrl: window.location.href,
                userAgent: navigator.userAgent,
                durationMs: Math.max(1, durationMs),
                microphoneEnabled: microphoneRecordedRef.current,
                upload: {
                    url: uploaded.url,
                    pathname: uploaded.pathname || pathname,
                    contentType,
                    size: recordingBlob.size,
                    filename: safeName,
                },
            });
        } catch (error) {
            setState("preview");
            toast({
                title: "Recording upload failed",
                description:
                    error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        }
    }

    return (
        <>
            <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="Report a bug"
                title="Report a bug"
                onClick={() => setOpen(true)}
            >
                <Icons.AlertCircle className="size-4" />
            </Button>
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && state === "recording") {
                        stopRecording();
                    }
                    if (!nextOpen) resetRecorder();
                    setOpen(nextOpen);
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Report a bug</DialogTitle>
                        <DialogDescription>
                            Record up to 1 minute 30 seconds with optional
                            microphone narration.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                            <div>
                                <Label htmlFor="bug-report-mic">
                                    Microphone
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Include your voice while recording.
                                </p>
                            </div>
                            <Switch
                                id="bug-report-mic"
                                checked={micEnabled}
                                disabled={state === "recording" || state === "uploading"}
                                onCheckedChange={setMicEnabled}
                            />
                        </div>

                        {previewUrl ? (
                            <video
                                src={previewUrl}
                                controls
                                className="aspect-video w-full rounded-md border bg-black"
                            />
                        ) : (
                            <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground">
                                {state === "recording"
                                    ? "Recording in progress"
                                    : "Your recording preview will appear here"}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="bug-report-description">
                                Description
                            </Label>
                            <Textarea
                                id="bug-report-description"
                                value={description}
                                disabled={state === "recording" || state === "uploading"}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="Optional: add any extra details about what happened."
                                rows={4}
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                                Duration: {formatBugReportDuration(durationMs)}
                            </span>
                            {state === "uploading" ? (
                                <span>Uploading {progress}%</span>
                            ) : null}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button asChild type="button" variant="ghost">
                            <Link href="/support/bug-reports">Issue Board</Link>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={state === "uploading"}
                            onClick={() => {
                                resetRecorder();
                            }}
                        >
                            Reset
                        </Button>
                        {state === "recording" ? (
                            <Button type="button" onClick={stopRecording}>
                                <Icons.StopCircle className="mr-2 size-4" />
                                Stop
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant={recordingBlob ? "outline" : "default"}
                                disabled={
                                    state === "requesting" || state === "uploading"
                                }
                                onClick={() => void startRecording()}
                            >
                                <Icons.AlertCircle className="mr-2 size-4" />
                                {recordingBlob ? "Record Again" : "Start"}
                            </Button>
                        )}
                        <Button
                            type="button"
                            disabled={!recordingBlob || state === "uploading"}
                            onClick={() => void submitReport()}
                        >
                            <Icons.Send className="mr-2 size-4" />
                            {state === "uploading" ? "Sending..." : "Send"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
