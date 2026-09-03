"use client";

import { useDriverDispatchActions } from "@/hooks/use-driver-dispatch-actions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import {
    Camera,
    CheckCircle2,
    CloudOff,
    FileCheck2,
    Pencil,
    Trash2,
} from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
    type DriverProofAttachment,
    type DriverProofFormValues,
    useDriverProofDraft,
} from "./form-context";

const supportedImageTypes = new Set<DriverProofAttachment["contentType"]>([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/avif",
    "image/heic",
    "image/heif",
]);

function fileToAttachment(file: File, index: number) {
    return new Promise<DriverProofAttachment>((resolve, reject) => {
        if (
            !supportedImageTypes.has(
                file.type as DriverProofAttachment["contentType"],
            )
        ) {
            reject(new Error(`${file.name} is not a supported image.`));
            return;
        }
        const reader = new FileReader();
        reader.onerror = () =>
            reject(new Error(`Unable to read ${file.name}.`));
        reader.onload = () => {
            const result = String(reader.result || "");
            const [, base64 = ""] = result.split(",");
            if (!base64 || base64.length > 8_000_000) {
                reject(
                    new Error(
                        `${file.name} is too large. Choose an image under 5 MB.`,
                    ),
                );
                return;
            }
            resolve({
                clientId: `photo-${Date.now()}-${index}`,
                fileName: file.name.slice(0, 180),
                contentType: file.type as DriverProofAttachment["contentType"],
                base64,
            });
        };
        reader.readAsDataURL(file);
    });
}

function SignatureField() {
    const { clearErrors, watch, setValue } =
        useFormContext<DriverProofFormValues>();
    const signaturePath = watch("signaturePath");
    const drawing = useRef(false);
    const path = useRef(signaturePath);
    path.current = signaturePath;

    const point = (event: PointerEvent<SVGSVGElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: Math.max(0, event.clientX - rect.left).toFixed(1),
            y: Math.max(0, event.clientY - rect.top).toFixed(1),
        };
    };

    const begin = (event: PointerEvent<SVGSVGElement>) => {
        drawing.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        const next = point(event);
        path.current = `${path.current ? `${path.current} ` : ""}M ${next.x} ${next.y}`;
        setValue("signaturePath", path.current, { shouldDirty: true });
        clearErrors("signaturePath");
    };

    const move = (event: PointerEvent<SVGSVGElement>) => {
        if (!drawing.current) return;
        const next = point(event);
        path.current = `${path.current} L ${next.x} ${next.y}`;
        setValue("signaturePath", path.current, {
            shouldDirty: true,
        });
        clearErrors("signaturePath");
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <Label className="flex items-center gap-2">
                    <Pencil className="size-4" /> Recipient signature
                </Label>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!signaturePath}
                    onClick={() => {
                        path.current = "";
                        setValue("signaturePath", "", { shouldDirty: true });
                    }}
                >
                    Clear
                </Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-dashed bg-white">
                <svg
                    role="img"
                    aria-label="Signature drawing area"
                    className="h-40 w-full touch-none cursor-crosshair"
                    onPointerDown={begin}
                    onPointerMove={move}
                    onPointerUp={() => {
                        drawing.current = false;
                    }}
                    onPointerCancel={() => {
                        drawing.current = false;
                    }}
                >
                    <path
                        d={signaturePath}
                        stroke="#111827"
                        strokeWidth="2.25"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <p className="text-xs text-muted-foreground">
                Sign inside the box. This acknowledgement is required.
            </p>
        </div>
    );
}

function PhotoField() {
    const { watch, setValue } = useFormContext<DriverProofFormValues>();
    const attachments = watch("attachments");
    const [isReading, setIsReading] = useState(false);

    return (
        <div className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Label className="flex items-center gap-2">
                        <Camera className="size-4" /> Delivery photos
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Optional · up to five photos
                    </p>
                </div>
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    disabled={isReading}
                >
                    <label>
                        {isReading ? "Reading photos…" : "Add photos"}
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif"
                            capture="environment"
                            multiple
                            disabled={isReading || attachments.length >= 5}
                            className="sr-only"
                            onChange={async (event) => {
                                const files = Array.from(
                                    event.target.files || [],
                                ).slice(0, Math.max(0, 5 - attachments.length));
                                if (!files.length) return;
                                setIsReading(true);
                                try {
                                    const next = await Promise.all(
                                        files.map(fileToAttachment),
                                    );
                                    setValue(
                                        "attachments",
                                        [...attachments, ...next],
                                        {
                                            shouldDirty: true,
                                        },
                                    );
                                } catch (error) {
                                    toast.error(
                                        error instanceof Error
                                            ? error.message
                                            : "Unable to add those photos.",
                                    );
                                } finally {
                                    setIsReading(false);
                                    event.target.value = "";
                                }
                            }}
                        />
                    </label>
                </Button>
            </div>
            {attachments.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {attachments.map((attachment) => (
                        <div
                            key={attachment.clientId}
                            className="group relative overflow-hidden rounded-lg border bg-muted"
                        >
                            <img
                                src={`data:${attachment.contentType};base64,${attachment.base64}`}
                                alt={attachment.fileName}
                                className="aspect-[4/3] w-full object-cover"
                            />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute right-2 top-2 size-8"
                                aria-label={`Remove ${attachment.fileName}`}
                                onClick={() =>
                                    setValue(
                                        "attachments",
                                        attachments.filter(
                                            (item) =>
                                                item.clientId !==
                                                attachment.clientId,
                                        ),
                                        { shouldDirty: true },
                                    )
                                }
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">
                    No photos attached.
                </p>
            )}
        </div>
    );
}

export function DriverProofForm({
    dispatchId,
    expectedManifestRevision,
    expectedPipelineRevision,
    onCompleted,
}: {
    dispatchId: number;
    expectedManifestRevision: string;
    expectedPipelineRevision?: string | null;
    onCompleted: () => void;
}) {
    const form = useFormContext<DriverProofFormValues>();
    const draft = useDriverProofDraft();
    const actions = useDriverDispatchActions();
    const signaturePath = form.watch("signaturePath");
    const online = useOnlineStatus();

    const submit = form.handleSubmit(async (values) => {
        if (!values.signaturePath.trim()) {
            form.setError("signaturePath", {
                type: "required",
                message: "Recipient signature is required.",
            });
            return;
        }
        try {
            await actions.completeWithProof.mutateAsync({
                dispatchId,
                requestId: values.requestId,
                expectedManifestRevision,
                expectedPipelineRevision: expectedPipelineRevision || undefined,
                receivedBy: values.receivedBy.trim() || undefined,
                receivedDate: new Date(),
                note: values.note.trim() || undefined,
                noteType: values.noteType,
                signaturePath: values.signaturePath,
                attachments: values.attachments,
            });
            draft.clearDraft();
            toast.success("Dispatch completed and proof saved.");
            onCompleted();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Completion paused. Your proof is still here—retry when connected.",
            );
        }
    });

    return (
        <form onSubmit={submit} className="space-y-5 p-4 sm:p-5">
            {draft.draftRecovered ? (
                <Alert>
                    <FileCheck2 />
                    <AlertTitle>Saved proof restored</AlertTitle>
                    <AlertDescription>
                        Your signature, notes, and photos stayed on this device.
                    </AlertDescription>
                </Alert>
            ) : null}
            {!online || draft.storageError ? (
                <Alert variant="destructive">
                    <CloudOff />
                    <AlertTitle>
                        {!online
                            ? "You are offline"
                            : "Draft storage needs attention"}
                    </AlertTitle>
                    <AlertDescription>
                        {draft.storageError ||
                            "Proof is saved on this device. Reconnect before completing the stop."}
                    </AlertDescription>
                </Alert>
            ) : null}

            <div className="space-y-2">
                <Label htmlFor="driver-received-by">Received by</Label>
                <Input
                    id="driver-received-by"
                    placeholder="Recipient name"
                    {...form.register("receivedBy")}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="driver-proof-note">Delivery note</Label>
                <Textarea
                    id="driver-proof-note"
                    placeholder="Optional delivery details"
                    maxLength={5000}
                    {...form.register("note")}
                />
            </div>
            <SignatureField />
            {form.formState.errors.signaturePath ? (
                <p className="text-sm text-destructive">
                    {form.formState.errors.signaturePath.message}
                </p>
            ) : null}
            <PhotoField />

            <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 pb-2 pt-4 backdrop-blur sm:-mx-5 sm:flex-row sm:px-5">
                <Button
                    type="submit"
                    className="min-h-12 flex-1"
                    disabled={actions.completeWithProof.isPending || !online}
                >
                    <CheckCircle2 className="mr-2 size-4" />
                    {actions.completeWithProof.isPending
                        ? "Saving proof…"
                        : "Complete dispatch"}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="min-h-12"
                    onClick={draft.clearDraft}
                >
                    Clear draft
                </Button>
            </div>
        </form>
    );
}
