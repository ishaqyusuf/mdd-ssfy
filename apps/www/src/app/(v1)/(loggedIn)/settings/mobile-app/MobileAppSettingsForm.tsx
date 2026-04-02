"use client";

import { useMemo, useRef, useState } from "react";

import { saveAppDownloadSettingAction } from "@/app-deps/(v1)/_actions/settings";
import Btn from "@/components/_v1/btn";
import { env } from "@/env.mjs";
import { generateRandomString } from "@/lib/utils";
import type { AppDownloadMeta, AppDownloadSettings } from "@/types/settings";
import { put } from "@vercel/blob";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";

type Props = {
    data: AppDownloadSettings;
};

export default function MobileAppSettingsForm({ data }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [saving, setSaving] = useState(false);
    const [meta, setMeta] = useState<AppDownloadMeta>(() => ({
        ...(data?.meta || {}),
    }));

    const downloadRoute = useMemo(() => "/api/download-app", []);
    const downloadUrl = useMemo(() => {
        const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
        return `${baseUrl}${downloadRoute}`;
    }, [downloadRoute]);

    async function handleFileSelect(file?: File | null) {
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);
        try {
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
            const blobPath = [
                "mobile-apps",
                `${Date.now()}-${generateRandomString(6)}-${sanitizedFileName}`,
            ].join("/");
            const uploaded = await put(blobPath, file, {
                access: "public",
                token: env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
                contentType:
                    file.type || "application/vnd.android.package-archive",
                onUploadProgress(event) {
                    setUploadProgress(Math.round(event.percentage));
                },
            });

            setMeta((prev) => ({
                ...prev,
                fileName: file.name,
                downloadUrl: uploaded.url ?? "",
                publicId: uploaded.pathname ?? null,
                assetId: null,
                uploadedAt: new Date().toISOString(),
            }));
            toast.success("APK uploaded. Save to activate this build.");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "APK upload failed.";
            toast.error(message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    async function handleSave() {
        if (!meta.downloadUrl?.trim()) {
            toast.error("Upload an APK file first.");
            return;
        }

        setSaving(true);
        try {
            await saveAppDownloadSettingAction(meta);
            toast.success("Mobile app download updated.");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to save app download settings.";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    }

    async function handleCopyDownloadLink() {
        try {
            await navigator.clipboard.writeText(downloadUrl);
            toast.success("Download link copied.");
        } catch (error) {
            toast.error("Unable to copy download link.");
        }
    }

    return (
        <div className="space-y-6">
            <div className="rounded-lg border bg-background p-6">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold">Mobile App APK</h1>
                    <p className="text-sm text-muted-foreground">
                        Upload the latest Android build for super-admin managed
                        downloads. The public download endpoint will always
                        serve the saved APK below.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-lg border bg-background p-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="apk-file">APK File</Label>
                            <input
                                id="apk-file"
                                ref={fileInputRef}
                                type="file"
                                accept=".apk,application/vnd.android.package-archive"
                                className="block w-full text-sm"
                                disabled={uploading || saving}
                                onChange={(event) => {
                                    handleFileSelect(
                                        event.target.files?.[0] || null,
                                    );
                                }}
                            />
                            <p className="text-xs text-muted-foreground">
                                Upload a new Android APK to replace the current
                                download.
                            </p>
                            {(uploading || uploadProgress > 0) && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Uploading APK...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full bg-primary transition-[width] duration-200"
                                            style={{
                                                width: `${uploadProgress}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="apk-version">Version</Label>
                                <Input
                                    id="apk-version"
                                    placeholder="1.0.306"
                                    value={meta.version || ""}
                                    onChange={(event) =>
                                        setMeta((prev) => ({
                                            ...prev,
                                            version: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="apk-file-name">File Name</Label>
                                <Input
                                    id="apk-file-name"
                                    placeholder="GND-Millwork.apk"
                                    value={meta.fileName || ""}
                                    onChange={(event) =>
                                        setMeta((prev) => ({
                                            ...prev,
                                            fileName: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="apk-notes">Release Notes</Label>
                            <Textarea
                                id="apk-notes"
                                placeholder="Optional notes about this build"
                                value={meta.notes || ""}
                                onChange={(event) =>
                                    setMeta((prev) => ({
                                        ...prev,
                                        notes: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Btn
                                isLoading={uploading || saving}
                                onClick={handleSave}
                            >
                                Save Active APK
                            </Btn>
                            <Button
                                variant="secondary"
                                onClick={handleCopyDownloadLink}
                            >
                                Copy Download Link
                            </Button>
                            <Button asChild variant="outline">
                                <a href={downloadRoute} target="_blank">
                                    Test Download Route
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border bg-background p-6">
                    <div className="space-y-4">
                        <div>
                            <h2 className="font-semibold">Current Active Build</h2>
                            <p className="text-sm text-muted-foreground">
                                This metadata is what `/api/download-app` uses.
                            </p>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div>
                                <div className="text-muted-foreground">
                                    Version
                                </div>
                                <div>{meta.version || "Not set"}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">
                                    File Name
                                </div>
                                <div className="break-all">
                                    {meta.fileName || "Not set"}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">
                                    Stable Download Link
                                </div>
                                <div className="break-all">{downloadUrl}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">
                                    Uploaded File URL
                                </div>
                                <div className="break-all">
                                    {meta.downloadUrl || "No file uploaded"}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">
                                    Uploaded At
                                </div>
                                <div>{meta.uploadedAt || "Not set"}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">
                                    Notes
                                </div>
                                <div>{meta.notes || "None"}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
