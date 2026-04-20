"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";

type FormState = {
  downloadUrl: string;
  version: string;
  expiresOn: string;
  notes: string;
};

const defaultForm: FormState = {
  downloadUrl: "",
  version: "",
  expiresOn: "",
  notes: "",
};

function toDateInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return format(date, "MMM d, yyyy 'at' h:mm a");
}

function formatDateLabel(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return format(date, "MMM d, yyyy");
}

function getExpiryState(expiresAt?: string | null) {
  if (!expiresAt) {
    return {
      label: "No expiry",
      variant: "secondary" as const,
      description: "The API download route will stay available until you set one.",
    };
  }

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return {
      label: "Invalid expiry",
      variant: "destructive" as const,
      description: "The saved expiry date could not be parsed.",
    };
  }

  if (date < new Date()) {
    return {
      label: "Expired",
      variant: "destructive" as const,
      description: "The API download route is currently blocked by expiry.",
    };
  }

  return {
    label: "Active",
    variant: "success" as const,
    description: `Available until ${format(date, "MMM d, yyyy")}.`,
  };
}

export function AppDownloadSettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(defaultForm);

  const { data, isPending } = useQuery(
    trpc.settings.getAppDownloadSettings.queryOptions(),
  );

  useEffect(() => {
    const meta = data?.meta;
    if (!meta) return;

    setForm({
      downloadUrl: meta.downloadUrl || "",
      version: meta.version || "",
      expiresOn: toDateInput(meta.expiresAt),
      notes: meta.notes || "",
    });
  }, [data]);

  const save = useMutation(
    trpc.settings.updateAppDownloadSettings.mutationOptions({
      async onSuccess() {
        await queryClient.invalidateQueries({
          queryKey: trpc.settings.getAppDownloadSettings.queryKey(),
        });
        toast({
          title: "App download settings saved",
          description: "The API download route now uses the updated link and expiry.",
          variant: "success",
        });
      },
      onError(error) {
        toast({
          title: "Unable to save app download settings",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const meta = data?.meta;
  const expiryState = getExpiryState(meta?.expiresAt);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">App Download</h2>
        <p className="text-muted-foreground">
          Store the hosted APK link, set its expiry date, and keep the reminder
          schedule pointed at <code>DEV_EMAIL</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Public Download Endpoint</CardTitle>
              <CardDescription>
                Share this API route instead of the raw hosted file URL.
              </CardDescription>
            </div>
            <Badge variant={expiryState.variant}>{expiryState.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-medium">API route</div>
            <div className="mt-1 break-all text-muted-foreground">
              <code>/api/download-app</code>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{expiryState.description}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Button asChild variant="outline">
              <Link href="/api/download-app" target="_blank">
                Open API Download URL
              </Link>
            </Button>
            {meta?.downloadUrl ? (
              <Button asChild variant="ghost">
                <Link href={meta.downloadUrl} target="_blank">
                  Open Source Link
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Download Source</CardTitle>
          <CardDescription>
            Paste the hosted APK link here. The app will route downloads through
            <code> /api/download-app </code> and stop serving it after expiry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate({
                downloadUrl: form.downloadUrl.trim(),
                version: form.version.trim() || null,
                expiresOn: form.expiresOn,
                notes: form.notes.trim() || null,
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="app-download-url">Hosted APK URL</Label>
              <Input
                id="app-download-url"
                placeholder="https://example.com/releases/gnd-millwork.apk"
                value={form.downloadUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    downloadUrl: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="app-download-version">Version</Label>
                <Input
                  id="app-download-version"
                  placeholder="1.0.7"
                  value={form.version}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      version: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-download-expiry">Expiry Date</Label>
                <Input
                  id="app-download-expiry"
                  type="date"
                  value={form.expiresOn}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expiresOn: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-download-notes">Notes</Label>
              <Textarea
                id="app-download-notes"
                placeholder="Optional release notes or rollout context for the team."
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>

            <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 text-sm md:grid-cols-2">
              <div>
                <div className="font-medium">Last updated</div>
                <div className="text-muted-foreground">
                  {formatDateTime(meta?.uploadedAt)}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {meta?.uploadedBy?.name || meta?.uploadedBy?.email || "Unknown user"}
                </div>
              </div>
              <div>
                <div className="font-medium">Last reminder sent</div>
                <div className="text-muted-foreground">
                  {formatDateTime(meta?.reminderSentAt)}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {formatDateLabel(meta?.reminderSentForExpiry)
                    ? `For expiry ${formatDateLabel(meta?.reminderSentForExpiry)}`
                    : "No reminder has been sent for the current expiry yet."}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  isPending ||
                  save.isPending ||
                  !form.downloadUrl.trim() ||
                  !form.expiresOn
                }
              >
                {save.isPending ? "Saving..." : "Save App Download"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
