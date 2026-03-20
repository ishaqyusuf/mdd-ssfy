"use client";

import { Suspense, useRef, useState } from "react";
import { z } from "zod";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { useTransition } from "@/utils/use-safe-transistion";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-file";

import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { Separator } from "@gnd/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { Badge } from "@gnd/ui/badge";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Switch } from "@gnd/ui/switch";
import {
    Bell,
    Camera,
    FileText,
    Key,
    Loader2,
    Trash2,
    Upload,
    User,
} from "lucide-react";

import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { getInitials } from "@gnd/utils";
import { env } from "@/env.mjs";

// ─── Schemas ───────────────────────────────────────────────

const profileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    username: z.string().optional().nullable(),
    phoneNo: z.string().optional().nullable(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

const documentSchema = z.object({
    title: z.string().min(1, "Document title is required"),
    url: z.string().min(1, "Document URL is required"),
    description: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
});

const notificationSchema = z.object({
    emailNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    orderUpdates: z.boolean(),
    dispatchAlerts: z.boolean(),
    paymentAlerts: z.boolean(),
    systemAnnouncements: z.boolean(),
});

// ─── Types ─────────────────────────────────────────────────

type UserProfile = {
    id: number;
    email: string;
    name: string | null;
    username: string | null;
    phoneNo: string | null;
    avatarUrl: string | null;
    notificationPreferences: {
        emailNotifications: boolean;
        smsNotifications: boolean;
        orderUpdates: boolean;
        dispatchAlerts: boolean;
        paymentAlerts: boolean;
        systemAnnouncements: boolean;
    };
    documents: {
        id: number;
        title: string | null;
        url: string;
        description: string | null;
        expiresAt: string | null;
        createdAt: Date | null;
    }[];
};

// ─── Main ──────────────────────────────────────────────────

export function UserProfileInfo() {
    return (
        <Suspense fallback={<ProfileSkeleton />}>
            <ProfileContent />
        </Suspense>
    );
}

function ProfileContent() {
    const trpc = useTRPC();
    const qc = useQueryClient();
    const { data: profile } = useQuery(trpc.user.getProfile.queryOptions());

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: trpc.user.getProfile.queryKey() });
    };

    if (!profile) return <ProfileSkeleton />;

    return (
        <div className="space-y-6">
            {/* Avatar banner */}
            <AvatarBanner profile={profile} onUpdate={invalidate} />

            {/* Tabs */}
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="profile" className="gap-2">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                        <Key className="h-4 w-4" />
                        <span className="hidden sm:inline">Security</span>
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Documents</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                        <Bell className="h-4 w-4" />
                        <span className="hidden sm:inline">Notifications</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-6">
                    <ProfileTab profile={profile} onUpdate={invalidate} />
                </TabsContent>

                <TabsContent value="security" className="mt-6">
                    <SecurityTab />
                </TabsContent>

                <TabsContent value="documents" className="mt-6">
                    <DocumentsTab
                        documents={profile.documents}
                        onUpdate={invalidate}
                    />
                </TabsContent>

                <TabsContent value="notifications" className="mt-6">
                    <NotificationsTab
                        preferences={profile.notificationPreferences}
                        onUpdate={invalidate}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─── Avatar Banner ─────────────────────────────────────────

function AvatarBanner({
    profile,
    onUpdate,
}: {
    profile: UserProfile;
    onUpdate: () => void;
}) {
    const trpc = useTRPC();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, startUpload] = useTransition();

    const updateProfile = useMutation(
        trpc.user.updateProfile.mutationOptions({
            onSuccess() {
                toast.success("Avatar updated");
                onUpdate();
            },
            onError(err) {
                toast.error(
                    err.message ??
                        "Failed to update avatar. Please use a valid image file (JPEG, PNG, WebP).",
                );
            },
        }),
    );

    const handleAvatarUpload = async (file: File) => {
        startUpload(async () => {
            const formData = new FormData();
            formData.append("file", file);
            const data = await uploadFile(formData, "dyke");
            if (data?.error) {
                toast.error(data.error.message);
                return;
            }
            const avatarUrl = data.secure_url || data.public_id;
            updateProfile.mutate({
                name: profile.name ?? "",
                username: profile.username,
                phoneNo: profile.phoneNo,
                avatarUrl,
            });
        });
    };

    const avatarSrc = profile.avatarUrl
        ? profile.avatarUrl.startsWith("http")
            ? profile.avatarUrl
            : `${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${profile.avatarUrl}`
        : undefined;

    const initials = getInitials(profile.name ?? profile.email ?? "U");

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Avatar className="h-20 w-20">
                            {avatarSrc && (
                                <AvatarImage src={avatarSrc} alt={profile.name ?? ""} />
                            )}
                            <AvatarFallback className="text-xl font-semibold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || updateProfile.isPending}
                            className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                            title="Upload avatar"
                        >
                            {uploading || updateProfile.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Camera className="h-3 w-3" />
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAvatarUpload(file);
                            }}
                        />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{profile.name}</h2>
                        <p className="text-sm text-muted-foreground">
                            {profile.email}
                        </p>
                        {profile.username && (
                            <p className="text-xs text-muted-foreground">
                                @{profile.username}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Profile Tab ───────────────────────────────────────────

function ProfileTab({
    profile,
    onUpdate,
}: {
    profile: UserProfile;
    onUpdate: () => void;
}) {
    const trpc = useTRPC();
    const form = useZodForm(profileSchema, {
        defaultValues: {
            name: profile.name ?? "",
            username: profile.username ?? "",
            phoneNo: profile.phoneNo ?? "",
        },
    });

    const save = useMutation(
        trpc.user.updateProfile.mutationOptions({
            onSuccess() {
                toast.success("Profile updated successfully");
                onUpdate();
            },
            onError(err) {
                toast.error(err.message ?? "Failed to update profile");
            },
        }),
    );

    const onSubmit = form.handleSubmit((values) => {
        save.mutate({
            ...values,
            avatarUrl: profile.avatarUrl,
        });
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                    Update your name, username, and contact details.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormInput
                                label="Full Name"
                                control={form.control}
                                name="name"
                                placeholder="Your full name"
                            />
                            <FormInput
                                label="Username"
                                control={form.control}
                                name="username"
                                placeholder="@username"
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormInput
                                label="Phone Number"
                                control={form.control}
                                name="phoneNo"
                                placeholder="+1 (555) 000-0000"
                            />
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Email Address
                                </Label>
                                <Input
                                    value={profile.email}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Contact support to change your email.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <SubmitButton
                                isSubmitting={save.isPending}
                                disabled={save.isPending}
                            >
                                Save Changes
                            </SubmitButton>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

// ─── Security Tab ──────────────────────────────────────────

function SecurityTab() {
    const trpc = useTRPC();
    const form = useZodForm(passwordSchema, {
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const change = useMutation(
        trpc.user.changePassword.mutationOptions({
            onSuccess() {
                toast.success("Password changed successfully");
                form.reset();
            },
            onError(err) {
                toast.error(err.message ?? "Failed to change password");
            },
        }),
    );

    const onSubmit = form.handleSubmit((values) => {
        change.mutate({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
        });
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                    Keep your account secure by using a strong password.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
                        <FormInput
                            label="Current Password"
                            control={form.control}
                            name="currentPassword"
                            type="password"
                            placeholder="Enter current password"
                        />
                        <FormInput
                            label="New Password"
                            control={form.control}
                            name="newPassword"
                            type="password"
                            placeholder="At least 6 characters"
                        />
                        <FormInput
                            label="Confirm New Password"
                            control={form.control}
                            name="confirmPassword"
                            type="password"
                            placeholder="Re-enter new password"
                        />
                        <div className="flex justify-end">
                            <SubmitButton
                                isSubmitting={change.isPending}
                                disabled={change.isPending}
                            >
                                Update Password
                            </SubmitButton>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

// ─── Documents Tab ─────────────────────────────────────────

type UserDocument = {
    id: number;
    title: string | null;
    url: string;
    description: string | null;
    expiresAt: string | null;
    createdAt: Date | null;
};

function DocumentsTab({
    documents,
    onUpdate,
}: {
    documents: UserDocument[];
    onUpdate: () => void;
}) {
    const trpc = useTRPC();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, startUpload] = useTransition();

    const form = useZodForm(documentSchema, {
        defaultValues: {
            title: "",
            url: "",
            description: "",
            expiresAt: "",
        },
    });

    const save = useMutation(
        trpc.user.saveDocument.mutationOptions({
            onSuccess() {
                toast.success("Document saved");
                form.reset();
                onUpdate();
            },
            onError(err) {
                toast.error(err.message ?? "Failed to save document");
            },
        }),
    );

    const remove = useMutation(
        trpc.user.deleteDocument.mutationOptions({
            onSuccess() {
                toast.success("Document deleted");
                onUpdate();
            },
            onError(err) {
                toast.error(err.message ?? "Failed to delete document");
            },
        }),
    );

    const handleFileUpload = async (file: File) => {
        startUpload(async () => {
            const formData = new FormData();
            formData.append("file", file);
            const data = await uploadFile(formData, "contractor-document");
            if (data?.error) {
                toast.error(data.error.message);
                return;
            }
            form.setValue("url", data.secure_url ?? data.public_id ?? "");
            form.setValue("title", file.name.replace(/\.[^.]+$/, ""));
        });
    };

    const onSubmit = form.handleSubmit((values) => {
        save.mutate(values);
    });

    return (
        <div className="space-y-6">
            {/* Upload form */}
            <Card>
                <CardHeader>
                    <CardTitle>Upload Document</CardTitle>
                    <CardDescription>
                        Upload a document and optionally set an expiry date.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={onSubmit} className="space-y-4">
                            {/* File picker */}
                            <div className="space-y-2">
                                <Label>File</Label>
                                <div
                                    className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 hover:border-muted-foreground/50 transition-colors"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                                    <span className="text-sm text-muted-foreground">
                                        {uploading
                                            ? "Uploading…"
                                            : form.watch("url")
                                              ? "File uploaded — click to replace"
                                              : "Click to select a file"}
                                    </span>
                                    {form.watch("url") && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-auto"
                                        >
                                            Uploaded
                                        </Badge>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="*/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(file);
                                    }}
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormInput
                                    label="Document Title"
                                    control={form.control}
                                    name="title"
                                    placeholder="e.g. Driver's License"
                                />
                                <div className="space-y-2">
                                    <Label>Expiry Date</Label>
                                    <Input
                                        type="date"
                                        {...form.register("expiresAt")}
                                    />
                                </div>
                            </div>
                            <FormInput
                                label="Description (optional)"
                                control={form.control}
                                name="description"
                                placeholder="Brief description of the document"
                            />

                            <div className="flex justify-end">
                                <SubmitButton
                                    isSubmitting={save.isPending || uploading}
                                    disabled={
                                        save.isPending ||
                                        uploading ||
                                        !form.watch("url")
                                    }
                                >
                                    Save Document
                                </SubmitButton>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Documents list */}
            {documents.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your Documents</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {documents.map((doc) => (
                            <DocumentRow
                                key={doc.id}
                                doc={doc}
                                onDelete={() =>
                                    remove.mutate({ id: doc.id })
                                }
                                deleting={remove.isPending}
                            />
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function DocumentRow({
    doc,
    onDelete,
    deleting,
}: {
    doc: UserDocument;
    onDelete: () => void;
    deleting: boolean;
}) {
    const isExpired =
        doc.expiresAt && new Date(doc.expiresAt) < new Date();
    const expiryLabel = doc.expiresAt
        ? new Date(doc.expiresAt).toLocaleDateString()
        : null;

    return (
        <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                    <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline truncate block"
                    >
                        {doc.title}
                    </a>
                    {doc.description && (
                        <p className="text-xs text-muted-foreground truncate">
                            {doc.description}
                        </p>
                    )}
                    {expiryLabel && (
                        <span
                            className={`text-xs ${isExpired ? "text-destructive" : "text-muted-foreground"}`}
                        >
                            {isExpired ? "Expired: " : "Expires: "}
                            {expiryLabel}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
                {isExpired && (
                    <Badge variant="destructive" className="text-xs">
                        Expired
                    </Badge>
                )}
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={onDelete}
                    disabled={deleting}
                    title="Delete document"
                >
                    {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}

// ─── Notifications Tab ─────────────────────────────────────

type NotificationPreferences = {
    emailNotifications: boolean;
    smsNotifications: boolean;
    orderUpdates: boolean;
    dispatchAlerts: boolean;
    paymentAlerts: boolean;
    systemAnnouncements: boolean;
};

function NotificationsTab({
    preferences,
    onUpdate,
}: {
    preferences: NotificationPreferences;
    onUpdate: () => void;
}) {
    const trpc = useTRPC();
    const form = useZodForm(notificationSchema, {
        defaultValues: preferences,
    });

    const save = useMutation(
        trpc.user.updateNotificationPreferences.mutationOptions({
            onSuccess() {
                toast.success("Notification preferences saved");
                onUpdate();
            },
            onError(err) {
                toast.error(err.message ?? "Failed to save preferences");
            },
        }),
    );

    const onSubmit = form.handleSubmit((values) => {
        save.mutate(values);
    });

    const notifGroups: {
        label: string;
        description: string;
        name: keyof NotificationPreferences;
    }[][] = [
        [
            {
                label: "Email Notifications",
                description: "Receive updates via email",
                name: "emailNotifications",
            },
            {
                label: "SMS Notifications",
                description: "Receive updates via text message",
                name: "smsNotifications",
            },
        ],
        [
            {
                label: "Order Updates",
                description: "Status changes on your orders",
                name: "orderUpdates",
            },
            {
                label: "Dispatch Alerts",
                description: "Delivery and dispatch notifications",
                name: "dispatchAlerts",
            },
            {
                label: "Payment Alerts",
                description: "Payment confirmations and reminders",
                name: "paymentAlerts",
            },
            {
                label: "System Announcements",
                description: "Platform updates and maintenance windows",
                name: "systemAnnouncements",
            },
        ],
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                    Choose how and when you want to be notified.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={onSubmit} className="space-y-6">
                        {notifGroups.map((group, gi) => (
                            <div key={gi} className="space-y-4">
                                {gi === 0 && (
                                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Channels
                                    </p>
                                )}
                                {gi === 1 && (
                                    <>
                                        <Separator />
                                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                            Event Types
                                        </p>
                                    </>
                                )}
                                {group.map((item) => (
                                    <NotifRow
                                        key={item.name}
                                        label={item.label}
                                        description={item.description}
                                        checked={form.watch(item.name)}
                                        onChange={(v) =>
                                            form.setValue(item.name, v, {
                                                shouldDirty: true,
                                            })
                                        }
                                    />
                                ))}
                            </div>
                        ))}
                        <div className="flex justify-end pt-2">
                            <SubmitButton
                                isSubmitting={save.isPending}
                                disabled={save.isPending}
                            >
                                Save Preferences
                            </SubmitButton>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function NotifRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

// ─── Skeleton ──────────────────────────────────────────────

function ProfileSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-28 rounded-xl bg-muted" />
            <div className="h-10 w-full rounded-lg bg-muted" />
            <div className="h-64 rounded-xl bg-muted" />
        </div>
    );
}

